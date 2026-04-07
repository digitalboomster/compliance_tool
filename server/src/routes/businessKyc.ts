import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { writeAudit } from '../lib/audit.js'
import { pathParam } from '../lib/params.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const businessKycRouter = Router()
businessKycRouter.use(requireAuth)

businessKycRouter.get('/', async (_req, res) => {
  const rows = await prisma.businessKycApplication.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(rows)
})

const createSchema = z.object({
  businessName: z.string().min(1),
  rcNumber: z.string().min(1),
  physicalAddress: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  websiteUrl: z.string().optional(),
  natureOfBusiness: z.string().min(1),
  repFullName: z.string().optional(),
  repDateOfBirth: z.string().optional(),
  repBvn: z.string().optional(),
  repPhone: z.string().optional(),
})

businessKycRouter.post('/', async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const row = await prisma.businessKycApplication.create({
    data: { ...parsed.data, status: 'DRAFT' },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'BUSINESS_KYC_DRAFT_CREATED',
    entityType: 'BusinessKycApplication',
    entityId: row.id,
    req,
  })
  res.status(201).json(row)
})

const submitSchema = z.object({
  status: z.enum(['PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']),
})

businessKycRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = submitSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body' })
    return
  }
  const { status } = parsed.data
  const row = await prisma.businessKycApplication.update({
    where: { id: pathParam(req.params.id) },
    data: {
      status,
      ...(status === 'PENDING_REVIEW' ? { submittedAt: new Date() } : {}),
      ...(['APPROVED', 'REJECTED'].includes(status) ? { reviewedAt: new Date() } : {}),
    },
  })
  await writeAudit({
    actorUserId: req.user!.id,
    action: 'BUSINESS_KYC_UPDATED',
    entityType: 'BusinessKycApplication',
    entityId: row.id,
    req,
  })
  res.json(row)
})
