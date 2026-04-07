import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { writeAudit } from '../lib/audit.js'
import { pathParam } from '../lib/params.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const incidentsRouter = Router()
incidentsRouter.use(requireAuth)

incidentsRouter.get('/', async (_req, res) => {
  const rows = await prisma.incidentTicket.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  res.json(rows)
})

const createSchema = z.object({
  category: z.enum([
    'API_INTEGRATION',
    'WALLET_DEBIT',
    'WRONG_AIRTIME_DATA',
    'WRONG_TV',
    'TOKEN_ERROR',
    'VALUE_MISMATCH',
    'DOWNTIME',
    'FUNDING',
    'OTHER',
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  responseSlaDueAt: z.string().optional(),
  resolveDueAt: z.string().optional(),
})

incidentsRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const ref = `INC-${Date.now().toString(36).toUpperCase()}`
  const row = await prisma.incidentTicket.create({
    data: {
      reference: ref,
      category: parsed.data.category,
      title: parsed.data.title,
      description: parsed.data.description,
      responseSlaDueAt: parsed.data.responseSlaDueAt ? new Date(parsed.data.responseSlaDueAt) : null,
      resolveDueAt: parsed.data.resolveDueAt ? new Date(parsed.data.resolveDueAt) : null,
      openedByUserId: req.user!.id,
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'INCIDENT_OPENED',
    entityType: 'IncidentTicket',
    entityId: row.id,
    req,
  })
  res.status(201).json(row)
})

const patchSchema = z.object({
  status: z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED']).optional(),
})

incidentsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const data: { status?: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED'; resolvedAt?: Date | null } = {}
  if (parsed.data.status) data.status = parsed.data.status
  if (parsed.data.status === 'RESOLVED') data.resolvedAt = new Date()
  const row = await prisma.incidentTicket.update({
    where: { id: pathParam(req.params.id) },
    data,
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'INCIDENT_UPDATED',
    entityType: 'IncidentTicket',
    entityId: row.id,
    req,
  })
  res.json(row)
})
