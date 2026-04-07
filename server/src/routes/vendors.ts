import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { writeAudit } from '../lib/audit.js'
import { pathParam } from '../lib/params.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const vendorsRouter = Router()
vendorsRouter.use(requireAuth)

vendorsRouter.get('/', async (_req, res) => {
  const rows = await prisma.vendorProcessor.findMany({ orderBy: { name: 'asc' } })
  res.json(rows)
})

const createSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email().optional(),
  notes: z.string().optional(),
})

vendorsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const row = await prisma.vendorProcessor.create({ data: parsed.data })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'VENDOR_CREATED',
    entityType: 'VendorProcessor',
    entityId: row.id,
    req,
  })
  res.status(201).json(row)
})

const patchSchema = z.object({
  dpaSignedAt: z.string().optional().nullable(),
  lastQuestionnaireAt: z.string().optional().nullable(),
  notes: z.string().optional(),
})

vendorsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const data: {
    dpaSignedAt?: Date | null
    lastQuestionnaireAt?: Date | null
    notes?: string
  } = {}
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes
  if (parsed.data.dpaSignedAt !== undefined) {
    data.dpaSignedAt = parsed.data.dpaSignedAt ? new Date(parsed.data.dpaSignedAt) : null
  }
  if (parsed.data.lastQuestionnaireAt !== undefined) {
    data.lastQuestionnaireAt = parsed.data.lastQuestionnaireAt
      ? new Date(parsed.data.lastQuestionnaireAt)
      : null
  }
  const row = await prisma.vendorProcessor.update({
    where: { id: pathParam(req.params.id) },
    data,
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'VENDOR_UPDATED',
    entityType: 'VendorProcessor',
    entityId: row.id,
    req,
  })
  res.json(row)
})
