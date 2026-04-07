import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { prisma } from '../prisma.js'
import { writeAudit } from '../lib/audit.js'
import { saveUploadedFile, sendDocumentFile, uploadsConfigured } from '../lib/documentStorage.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { formatCase } from '../lib/caseDto.js'
import { pathParam } from '../lib/params.js'
import type { CaseStatus, DecisionType } from '@prisma/client'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
})

export const casesRouter = Router()
casesRouter.use(requireAuth)

/** Stub: plug ClamAV or cloud AV in production (spec 1.1). */
async function runVirusScan(_buffer: Buffer): Promise<'CLEAN' | 'REJECTED'> {
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

casesRouter.post('/:publicId/escalate', async (req: AuthedRequest, res) => {
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  if (c.status === 'APPROVED' || c.status === 'REJECTED') {
    res.status(400).json({ error: 'Case is closed' })
    return
  }
  await prisma.complianceCase.update({
    where: { id: c.id },
    data: { status: 'ESCALATED' },
  })
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'USER',
      actorUserId: req.user!.id,
      text: 'Case escalated for senior review.',
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_ESCALATED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    req,
  })
  res.json({ ok: true })
})

const checkPatchSchema = z.object({
  state: z.enum(['PASSED', 'REVIEW', 'FAILED']),
})

casesRouter.patch('/:publicId/checks/:checkId', async (req: AuthedRequest, res) => {
  const parsed = checkPatchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const publicId = pathParam(req.params.publicId)
  const checkId = pathParam(req.params.checkId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  if (c.status === 'APPROVED' || c.status === 'REJECTED') {
    res.status(400).json({ error: 'Case is closed' })
    return
  }
  const check = await prisma.caseCheck.findFirst({
    where: { id: checkId, caseId: c.id },
  })
  if (!check) {
    res.status(404).json({ error: 'Check not found' })
    return
  }
  await prisma.caseCheck.update({
    where: { id: check.id },
    data: { state: parsed.data.state },
  })
  const stateLabel =
    parsed.data.state === 'PASSED'
      ? 'cleared as passed (false positive)'
      : parsed.data.state === 'FAILED'
        ? 'marked failed'
        : 'marked for review'
  await prisma.caseTimelineEvent.create({
    data: {
      caseId: c.id,
      actorType: 'USER',
      actorUserId: req.user!.id,
      text: `Check "${check.name}" ${stateLabel}.`,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_CHECK_UPDATED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { checkId: check.id, checkName: check.name, state: parsed.data.state },
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
  if (!uploadsConfigured()) {
    res.status(503).json({
      error:
        'File uploads on Vercel require BLOB_READ_WRITE_TOKEN (Vercel Blob). Add it in Project → Environment Variables.',
    })
    return
  }
  const publicId = pathParam(req.params.publicId)
  const c = await prisma.complianceCase.findUnique({ where: { publicId } })
  if (!c) {
    res.status(404).json({ error: 'Case not found' })
    return
  }
  const file = req.file
  if (!file?.buffer) {
    res.status(400).json({ error: 'file field required' })
    return
  }
  const scan = await runVirusScan(file.buffer)
  if (scan !== 'CLEAN') {
    res.status(400).json({ error: 'File failed virus scan' })
    return
  }
  const { storageKey } = await saveUploadedFile({
    originalname: file.originalname,
    mimetype: file.mimetype,
    buffer: file.buffer,
  })
  const doc = await prisma.caseDocument.create({
    data: {
      caseId: c.id,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      virusScanStatus: 'CLEAN',
      uploadedByUserId: req.user!.id,
    },
  })
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
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CASE_DOCUMENT_DOWNLOADED',
    entityType: 'ComplianceCase',
    entityId: c.publicId,
    details: { documentId: doc.id, filename: doc.originalFilename },
    req,
  })
  sendDocumentFile(doc, res)
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
