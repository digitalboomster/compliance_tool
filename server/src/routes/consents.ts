import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { writeAudit } from '../lib/audit.js'
import { pathParam } from '../lib/params.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const consentsRouter = Router()
consentsRouter.use(requireAuth)

consentsRouter.get('/', async (_req, res) => {
  const rows = await prisma.consentRecord.findMany({ orderBy: { grantedAt: 'desc' }, take: 200 })
  res.json(rows)
})

const createSchema = z.object({
  subjectRef: z.string().min(1),
  purpose: z.string().min(1),
  version: z.string().min(1),
  channel: z.string().optional(),
})

consentsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const row = await prisma.consentRecord.create({ data: parsed.data })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CONSENT_RECORDED',
    entityType: 'ConsentRecord',
    entityId: row.id,
    req,
  })
  res.status(201).json(row)
})

consentsRouter.patch('/:id/withdraw', async (req: AuthedRequest, res) => {
  const row = await prisma.consentRecord.update({
    where: { id: pathParam(req.params.id) },
    data: { withdrawnAt: new Date() },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'CONSENT_WITHDRAWN',
    entityType: 'ConsentRecord',
    entityId: row.id,
    req,
  })
  res.json(row)
})
