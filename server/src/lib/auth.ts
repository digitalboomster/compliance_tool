import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me'

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}

export function signToken(userId: string, email: string, role: UserRole) {
  return jwt.sign({ sub: userId, email, role }, JWT_SECRET, { expiresIn: '7d' })
}

export type JwtPayload = { sub: string; email: string; role: UserRole }

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
  return decoded
}
