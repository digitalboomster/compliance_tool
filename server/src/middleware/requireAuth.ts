import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth.js'
import { prisma } from '../prisma.js'

export type AuthedRequest = Request & {
  user?: { id: string; email: string; role: string; name: string }
}

/**
 * No login UI: uses Bearer token if valid, otherwise the first user in the DB as the actor.
 * Requires at least one user (run prisma db seed).
 */
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const payload = verifyToken(token)
      const user = await prisma.user.findUnique({ where: { id: payload.sub } })
      if (user) {
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name }
        next()
        return
      }
    } catch {
      /* fall through to anonymous actor */
    }
  }

  const fallback = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!fallback) {
    res.status(503).json({
      error: 'No users in database. Run migrations and seed (server: npm run db:deploy-and-seed).',
    })
    return
  }
  req.user = {
    id: fallback.id,
    email: fallback.email,
    role: fallback.role,
    name: fallback.name,
  }
  next()
}
