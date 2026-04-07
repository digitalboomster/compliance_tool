import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth.js'
import { prisma } from '../prisma.js'

export type AuthedRequest = Request & {
  user?: { id: string; email: string; role: string; name: string }
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = verifyToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      res.status(401).json({ error: 'Invalid session' })
      return
    }
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
