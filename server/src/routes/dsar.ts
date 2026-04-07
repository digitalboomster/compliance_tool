import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { writeAudit } from '../lib/audit.js'
import { pathParam } from '../lib/params.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const dsarRouter = Router()
dsarRouter.use(requireAuth)

dsarRouter.get('/', async (_req, res) => {
  const rows = await prisma.dataSubjectRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  res.json(rows)
})

const createSchema = z.object({
  type: z.enum(['ACCESS', 'RECTIFICATION', 'ERASURE', 'PORTABILITY', 'OBJECTION']),
  subjectRef: z.string().min(1),
  requestBody: z.string().optional(),
})

dsarRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const row = await prisma.dataSubjectRequest.create({ data: parsed.data })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'DSAR_CREATED',
    entityType: 'DataSubjectRequest',
    entityId: row.id,
    req,
  })
  res.status(201).json(row)
})

const updateSchema = z.object({
  status: z.enum(['RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']).optional(),
  responseNote: z.string().optional(),
})

dsarRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const data: { status?: 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'; responseNote?: string; completedAt?: Date | null } = {
    ...parsed.data,
  }
  if (parsed.data.status === 'COMPLETED') data.completedAt = new Date()
  const row = await prisma.dataSubjectRequest.update({
    where: { id: pathParam(req.params.id) },
    data,
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'DSAR_UPDATED',
    entityType: 'DataSubjectRequest',
    entityId: row.id,
    details: parsed.data as Record<string, unknown>,
    req,
  })
  res.json(row)
})
