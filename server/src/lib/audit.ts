import type { Request } from 'express'
import { prisma } from '../prisma.js'

export async function writeAudit(input: {
  actorUserId: string | null
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown>
  req?: Request
}) {
  const ip = input.req?.ip ?? input.req?.socket?.remoteAddress
  const userAgent = input.req?.get('user-agent')
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ? JSON.stringify(input.details) : null,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  })
}
