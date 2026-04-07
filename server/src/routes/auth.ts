import { Router } from 'express'
import { prisma } from '../prisma.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const authRouter = Router()

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })
  res.json(user)
})
