import { Router } from 'express'
import { prisma } from '../prisma.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const activityRouter = Router()
activityRouter.use(requireAuth)

const ACTION_LABELS: Record<string, string> = {
  CASE_ASSIGNED: 'Case assigned',
  CASE_NOTE_CREATED: 'Note added to case',
  CASE_DECISION_APPROVE: 'Case approved',
  CASE_DECISION_REJECT: 'Case rejected',
  CASE_DECISION_REQUEST_INFO: 'More information requested',
  CASE_DOCUMENT_UPLOADED: 'Document uploaded',
  CASE_DOCUMENT_DOWNLOADED: 'Document downloaded',
  CASE_ESCALATED: 'Case escalated',
  CASE_CHECK_UPDATED: 'Compliance check updated',
  BUSINESS_KYC_DRAFT_CREATED: 'Business KYC draft saved',
  BUSINESS_KYC_UPDATED: 'Business KYC updated',
  INCIDENT_OPENED: 'Incident opened',
  INCIDENT_UPDATED: 'Incident updated',
  CONSENT_RECORDED: 'Consent recorded',
  CONSENT_WITHDRAWN: 'Consent withdrawn',
  DSAR_CREATED: 'Data subject request logged',
  DSAR_UPDATED: 'Data subject request updated',
  VENDOR_CREATED: 'Processor added',
  VENDOR_UPDATED: 'Processor updated',
}

function activityHref(entityType: string | null, entityId: string | null): string | null {
  if (!entityId) return null
  switch (entityType) {
    case 'ComplianceCase':
      return `/case/${entityId}`
    case 'IncidentTicket':
      return '/reports'
    case 'BusinessKycApplication':
      return '/customers'
    case 'VendorProcessor':
    case 'ConsentRecord':
    case 'DataSubjectRequest':
      return '/settings'
    default:
      return null
  }
}

activityRouter.get('/recent', async (_req, res) => {
  const [logs, openIncidents] = await Promise.all([
    prisma.auditLog.findMany({
      where: { NOT: { action: 'USER_LOGIN' } },
      orderBy: { createdAt: 'desc' },
      take: 35,
      include: { actorUser: { select: { name: true } } },
    }),
    prisma.incidentTicket.count({
      where: { status: { in: ['OPEN', 'ACKNOWLEDGED', 'ESCALATED'] } },
    }),
  ])

  const items = logs.map((l) => {
    const title = ACTION_LABELS[l.action] ?? l.action.replace(/_/g, ' ')
    const who = l.actorUser?.name ?? 'System'
    return {
      id: l.id,
      title,
      subtitle: who,
      href: activityHref(l.entityType, l.entityId),
      createdAt: l.createdAt.toISOString(),
    }
  })

  res.json({ items, openIncidents })
})
