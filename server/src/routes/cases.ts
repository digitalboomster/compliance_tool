import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import { prisma } from '../prisma.js'
import { writeAudit } from '../lib/audit.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { formatCase } from '../lib/caseDto.js'
import { pathParam } from '../lib/params.js'
import type { CaseStatus, DecisionType } from '@prisma/client'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir()
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    cb(null, `${randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
})

export const casesRouter = Router()
casesRouter.use(requireAuth)

/** Stub: plug ClamAV or cloud AV in production (spec 1.1). */
async function runVirusScan(_filePath: string): Promise<'CLEAN' | 'REJECTED'> {
  return 'CLEAN'
}

casesRouter.get('/', async (_req, res) => {
  const list = await prisma.complianceCase.findMany({
    orderBy: { openedAt: 'desc' },
    include: {
      checks: true,
      timeline: { orderBy: { at: 'desc' }, include: { actorUser: true } },
      documents: true,
      riskFactors: true,
    },
  })
  res.json(list.map(formatCase))
})

casesRouter.get('/:publicId', async (req, res) => {
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({
    where: { publicId },
    include: {
      checks: true,
      timeline: { orderBy: { at: 'desc' }, include: { actorUser: true } },
      documents: true,
      riskFactors: true,
    },
  })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  res.json(formatCase(c))
})

casesRouter.post('/:publicId/assign', async (req: AuthedRequest, res) => {
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  await prisma.complianceCase.update({
    where: { id: c.id },
    data: {
      assignedOfficerId: req.user!.id,
      status: 'IN_REVIEW',
    },
  })
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'USER',
      actorUserId: req.user!.id,
      text: `Case assigned to ${req.user!.name}.`,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_ASSIGNED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { assigneeId: req.user!.id },
    req,
  })
  res.json({ ok: true })
})

const noteSchema = z.object({ body: z.string().min(1).max(10000) })

casesRouter.post('/:publicId/notes', async (req: AuthedRequest, res) => {
  const parsed = noteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  await prisma.caseNote.create({
    data: {
      caseId: c.id,
      authorUserId: req.user!.id,
      body: parsed.data.body,
    },
  })
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'USER',
      actorUserId: req.user!.id,
      text: `Note added: ${parsed.data.body.slice(0, 120)}${parsed.data.body.length > 120 ? '…' : ''}`,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_NOTE_CREATED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    req,
  })
  res.status(201).json({ ok: true })
})

const decisionSchema = z.object({
  type: z.enum(['APPROVE', 'REJECT', 'REQUEST_INFO']),
  reasonCode: z.string().optional(),
  detail: z.string().optional(),
})

function decisionToStatus(d: DecisionType): CaseStatus {
  switch (d) {
    case 'APPROVE':
      return 'APPROVED'
    case 'REJECT':
      return 'REJECTED'
    case 'REQUEST_INFO':
    default:
      return 'PENDING'
  }
}

casesRouter.post('/:publicId/decisions', async (req: AuthedRequest, res) => {
  const parsed = decisionSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    return
  }
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  const { type, reasonCode, detail } = parsed.data
  if (type === 'REJECT' && !reasonCode) {
    res.status(400).json({ error: 'reasonCode required for rejection' })
    return
  }

  const newStatus = decisionToStatus(type)
  await prisma.caseDecision.create({
    data: {
      caseId: c.id,
      type,
      reasonCode: reasonCode ?? null,
      detail: detail ?? null,
      decidedByUserId: req.user!.id,
    },
  })
  await prisma.complianceCase.update({
    where: { id: c.id },
    data: {
      status: type === 'REQUEST_INFO' ? 'IN_REVIEW' : newStatus,
    },
  })
  const label =
    type === 'APPROVE' ? 'Approved' : type === 'REJECT' ? 'Rejected' : 'More information requested'
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'USER',
      actorUserId: req.user!.id,
      text: `${label}${reasonCode ? ` (${reasonCode})` : ''}.`,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: `CASE_DECISION_${type}`,
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { reasonCode, detail },
    req,
  })
  res.status(201).json({ ok: true, status: newStatus })
})

casesRouter.post('/:publicId/documents', upload.single('file'), async (req: AuthedRequest, res) => {
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  const file = req.file
  if (!file) {
    res.status(400).json({ error: 'file field required' })
    return
  }
  const scan = await runVirusScan(file.path)
  const doc = await prisma.caseDocument.create({
    data: {
      caseId: c.id,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: file.filename,
      virusScanStatus: scan === 'CLEAN' ? 'CLEAN' : 'REJECTED',
      uploadedByUserId: req.user!.id,
    },
  })
  if (scan !== 'CLEAN') {
    fs.unlinkSync(file.path)
    res.status(400).json({ error: 'File failed virus scan' })
    return
  }
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'SYSTEM',
      text: `Document uploaded: ${file.originalname} (${doc.virusScanStatus}).`,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_DOCUMENT_UPLOADED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { filename: file.originalname, documentId: doc.id },
    req,
  })
  res.status(201).json({
    id: doc.id,
    name: doc.originalFilename,
    virusScanStatus: doc.virusScanStatus,
  })
})

casesRouter.get('/:publicId/documents/:docId/download', async (req: AuthedRequest, res) => {
  const publicId = pathParam(req.params.publicId)
  const docId = pathParam(req.params.docId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  const doc = await prisma.caseDocument.findFirst({
    where: { id: docId, caseId: c.id },
  })
  if (!doc || doc.virusScanStatus !== 'CLEAN') {
    res.status(404).json({ error: 'Document not found' })
    return
  }
  const fp = path.join(UPLOAD_DIR, doc.storageKey)
  if (!fs.existsSync(fp)) {
    res.status(404).json({ error: 'File missing on disk' })
    return
  }
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_DOCUMENT_DOWNLOADED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { documentId: doc.id, filename: doc.originalFilename },
    req,
  })
  res.download(fp, doc.originalFilename)
})

casesRouter.get('/:publicId/audit', async (req: AuthedRequest, res) => {
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  const logs = await prisma.auditLog.findMany({
    where: { entityType: 'ComplianceCase', entityId: c.publicId },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  res.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      details: l.details ? (JSON.parse(l.details) as unknown) : null,
      createdAt: l.createdAt.toISOString(),
    })),
  )
})
