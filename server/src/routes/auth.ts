import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma.js'
import { verifyPassword, signToken } from '../lib/auth.js'
import { writeAudit } from '../lib/audit.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() })
    return
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }
  const token = signToken(user.id, user.email, user.role)
  await writeAudit({
    actorUserId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    req,
  })
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  res.json(user)
})
