import type {
  ComplianceCase,
  CaseCheck,
  CaseTimelineEvent,
  CaseDocument,
  CaseRiskFactor,
  User,
} from '@prisma/client'

type TimelineWithActor = CaseTimelineEvent & { actorUser: User | null }

/** Map Prisma CaseStatus enum string to client slug */
export function caseStatusClient(status: string) {
  const m: Record<string, string> = {
    PENDING: 'pending',
    IN_REVIEW: 'in_review',
    ESCALATED: 'escalated',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  }
  return m[status] ?? status.toLowerCase()
}

export function riskClient(r: string) {
  return r.toLowerCase() as 'low' | 'medium' | 'high'
}

export function checkStateClient(s: string) {
  const m: Record<string, string> = {
    PASSED: 'passed',
    REVIEW: 'review',
    FAILED: 'failed',
  }
  return m[s] ?? s.toLowerCase()
}

export function formatCase(
  c: ComplianceCase & {
    checks: CaseCheck[]
    timeline: TimelineWithActor[]
    documents: CaseDocument[]
    riskFactors: CaseRiskFactor[]
  },
) {
  const opened = c.openedAt.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  let sla = '—'
  if (c.slaDueAt) {
    const now = Date.now()
    const due = c.slaDueAt.getTime()
    if (due < now && c.status !== 'APPROVED' && c.status !== 'REJECTED') {
      sla = 'OVERDUE'
    } else if (c.status === 'APPROVED' || c.status === 'REJECTED') {
      sla = 'Closed'
    } else {
      const h = Math.max(0, Math.round((due - now) / 3600000))
      sla = `${h}h left`
    }
  }

  return {
    id: c.publicId,
    customer: c.customerName,
    type: c.type,
    risk: riskClient(c.risk),
    status: caseStatusClient(c.status),
    opened,
    sla,
    slaUrgent: sla === 'OVERDUE',
    country: c.country ?? undefined,
    phoneMasked: c.phoneMasked ?? undefined,
    application: c.applicationSummary ?? undefined,
    documents: c.documents.map((d) => ({
      id: d.id,
      name: d.originalFilename,
      date: d.createdAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      size: formatBytes(d.sizeBytes),
    })),
    checks: c.checks.map((k) => ({
      name: k.name,
      state: checkStateClient(k.state) as 'passed' | 'review' | 'failed',
      detail: k.detail ?? undefined,
    })),
    timeline: c.timeline.map((t) => ({
      at: t.at.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor:
        t.actorType === 'USER' && t.actorUser
          ? t.actorUser.name
          : t.actorType === 'USER'
            ? 'Officer'
            : 'System',
      text: t.text,
    })),
    riskFactors: c.riskFactors.map((r) => ({
      label: r.label,
      level: r.level,
      highlight: r.highlight,
    })),
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
