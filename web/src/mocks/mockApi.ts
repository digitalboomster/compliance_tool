/**
 * In-memory API for mock MVP — no server or database required.
 * Set VITE_USE_REAL_API=true to use real fetch instead.
 */
import type { CaseDto, QueueSummary } from '../types/api'

let idSeq = 1
const nextId = (p: string) => `${p}-${++idSeq}`

function clone<T>(x: T): T {
  return structuredClone(x)
}

function initialCases(): Record<string, CaseDto> {
  const cases: CaseDto[] = [
    {
      id: 'CB-4589',
      customer: 'Ada M.',
      type: 'KYC verification',
      risk: 'medium',
      status: 'in_review',
      opened: '30 Mar 2026, 14:22',
      sla: '2h left',
      slaUrgent: false,
      country: 'United Kingdom',
      phoneMasked: '+44 •••• ••892',
      application: 'Retail savings onboarding',
      documents: [
        { id: 'doc-4589-1', name: 'passport-scan.pdf', date: '30 Mar 2026', size: '118 KB' },
      ],
      checks: [
        { id: 'chk-4589-1', name: 'Identity provider', state: 'passed' },
        {
          id: 'chk-4589-2',
          name: 'Sanctions screening',
          state: 'review',
          detail:
            'Potential name match on OFAC list (ref #9921). Requires analyst clearance or false-positive mark.',
        },
      ],
      timeline: [
        { at: '30 Mar 2026, 14:22', actor: 'System', text: 'Documents received; virus scan passed.' },
        { at: '30 Mar 2026, 13:05', actor: 'System', text: 'Sanctions batch returned: 1 possible hit.' },
        { at: '30 Mar 2026, 12:18', actor: 'A. Officer', text: 'Case pulled from queue for review.' },
      ],
      riskFactors: [
        { label: 'New jurisdiction', level: 'Low', highlight: false },
        { label: 'Transaction velocity', level: 'High', highlight: true },
        { label: 'Account age', level: '< 1 day', highlight: false },
      ],
    },
    {
      id: 'CB-4590',
      customer: 'Liam S.',
      type: 'Sanctions review',
      risk: 'high',
      status: 'escalated',
      opened: '29 Mar 2026, 18:00',
      sla: 'OVERDUE',
      slaUrgent: true,
      country: 'Nigeria',
      phoneMasked: '+234 ••• ••• 441',
      application: 'Virtual account funding',
      documents: [],
      checks: [
        { id: 'chk-4590-1', name: 'Corporate registry', state: 'passed' },
        {
          id: 'chk-4590-2',
          name: 'UBO screening',
          state: 'review',
          detail: 'Secondary entity on watchlist (low confidence).',
        },
      ],
      timeline: [
        { at: '30 Mar 2026, 09:00', actor: 'System', text: 'Escalated: SLA breach warning.' },
        { at: '29 Mar 2026, 18:00', actor: 'A. Officer', text: 'Requested senior sign-off.' },
      ],
      riskFactors: [{ label: 'Cross-border', level: 'High', highlight: true }],
    },
    {
      id: 'CB-4591',
      customer: 'Sofia R.',
      type: 'Flagged transaction',
      risk: 'low',
      status: 'pending',
      opened: '30 Mar 2026, 08:15',
      sla: '6h left',
      slaUrgent: false,
      country: 'Portugal',
      phoneMasked: '+351 ••• ••• 102',
      application: 'Peer transfer',
      documents: [],
      checks: [
        {
          id: 'chk-4591-1',
          name: 'Velocity rules',
          state: 'review',
          detail: 'Spike vs 30-day baseline.',
        },
      ],
      timeline: [{ at: '30 Mar 2026, 08:15', actor: 'System', text: 'Transaction held for review.' }],
      riskFactors: [{ label: 'Velocity', level: 'Medium', highlight: false }],
    },
  ]
  return Object.fromEntries(cases.map((c) => [c.id, c]))
}

type Incident = {
  id: string
  reference: string
  category: string
  status: string
  title: string
  createdAt: string
}
type KycRow = {
  id: string
  businessName: string
  rcNumber: string
  status: string
  email: string
  submittedAt: string | null
}
type Vendor = { id: string; name: string; contactEmail: string | null; notes: string | null }
type Consent = {
  id: string
  subjectRef: string
  purpose: string
  version: string
  withdrawnAt: string | null
}
type Dsar = {
  id: string
  type: string
  status: string
  subjectRef: string
  createdAt: string
  responseNote?: string | null
}
type ActivityItem = {
  id: string
  title: string
  subtitle: string
  href: string | null
  createdAt: string
}

const state = {
  cases: initialCases(),
  incidents: [
    {
      id: 'inc-1',
      reference: 'INC-MOCK01',
      category: 'API_INTEGRATION',
      status: 'OPEN',
      title: 'Webhook latency spike',
      createdAt: new Date().toISOString(),
    },
  ] as Incident[],
  kyc: [
    {
      id: 'kyc-1',
      businessName: 'Demo Ventures Ltd',
      rcNumber: 'RC-1001',
      status: 'DRAFT',
      email: 'demo@example.com',
      submittedAt: null,
    },
  ] as KycRow[],
  vendors: [
    {
      id: 'v-1',
      name: 'iRecharge Tech-Innovations Ltd',
      contactEmail: 'support@irecharge.com.ng',
      notes: 'Utility & VA partner',
    },
  ] as Vendor[],
  consents: [
    {
      id: 'c-1',
      subjectRef: 'user_ref_001',
      purpose: 'Marketing',
      version: 'v1',
      withdrawnAt: null,
    },
  ] as Consent[],
  dsars: [
    {
      id: 'd-1',
      type: 'ACCESS',
      status: 'RECEIVED',
      subjectRef: 'subj_88',
      createdAt: new Date().toISOString(),
    },
  ] as Dsar[],
  activity: [] as ActivityItem[],
}

function logActivity(title: string, href: string | null = null) {
  state.activity.unshift({
    id: nextId('act'),
    title,
    subtitle: 'Demo officer',
    href,
    createdAt: new Date().toISOString(),
  })
  state.activity = state.activity.slice(0, 40)
}

function queueSummary(): QueueSummary {
  const list = Object.values(state.cases)
  const open = list.filter((c) => ['pending', 'in_review', 'escalated'].includes(c.status))
  return {
    openCases: open.length,
    dueToday: open.filter((c) => c.slaUrgent).length,
    escalated: list.filter((c) => c.status === 'escalated').length,
    autoCleared24h: 2,
    efficiencyPct: 91,
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function pathOnly(url: string): string {
  if (url.startsWith('http')) {
    return new URL(url).pathname
  }
  return url.split('?')[0]
}

export async function mockFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const p = pathOnly(url)
  const body =
    init.body && typeof init.body === 'string'
      ? (JSON.parse(init.body) as Record<string, unknown>)
      : undefined

  if (p === '/api/auth/me' && method === 'GET') {
    return json({
      id: 'mock-user-1',
      email: 'officer@savvybee.internal',
      name: 'A. Officer',
      role: 'COMPLIANCE_OFFICER',
      createdAt: new Date().toISOString(),
    })
  }

  if (p === '/api/cases' && method === 'GET') {
    const list = Object.values(state.cases).sort((a, b) => b.id.localeCompare(a.id))
    return json(list)
  }

  if (p === '/api/stats/queue-summary' && method === 'GET') {
    return json(queueSummary())
  }

  if (p === '/api/activity/recent' && method === 'GET') {
    const openIncidents = state.incidents.filter((i) => i.status !== 'RESOLVED').length
    const items =
      state.activity.length > 0
        ? state.activity
        : [
            {
              id: 'seed-1',
              title: 'Mock mode active',
              subtitle: 'System',
              href: null,
              createdAt: new Date().toISOString(),
            },
          ]
    return json({ items, openIncidents })
  }

  const caseMatch = p.match(/^\/api\/cases\/([^/]+)$/)
  if (caseMatch && method === 'GET') {
    const id = decodeURIComponent(caseMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    return json(clone(c))
  }

  const notesMatch = p.match(/^\/api\/cases\/([^/]+)\/notes$/)
  if (notesMatch && method === 'POST') {
    const id = decodeURIComponent(notesMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    const b = body as { body?: string }
    const text = b?.body ?? ''
    c.timeline.unshift({
      at: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'A. Officer',
      text: `Note added: ${text.slice(0, 120)}${text.length > 120 ? '…' : ''}`,
    })
    logActivity('Note added to case', `/case/${id}`)
    return json({ ok: true }, 201)
  }

  const assignMatch = p.match(/^\/api\/cases\/([^/]+)\/assign$/)
  if (assignMatch && method === 'POST') {
    const id = decodeURIComponent(assignMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    if (c.status !== 'approved' && c.status !== 'rejected') c.status = 'in_review'
    c.timeline.unshift({
      at: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'A. Officer',
      text: 'Case assigned to A. Officer.',
    })
    logActivity('Case assigned', `/case/${id}`)
    return json({ ok: true })
  }

  const escMatch = p.match(/^\/api\/cases\/([^/]+)\/escalate$/)
  if (escMatch && method === 'POST') {
    const id = decodeURIComponent(escMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    c.status = 'escalated'
    c.timeline.unshift({
      at: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'A. Officer',
      text: 'Case escalated for senior review.',
    })
    logActivity('Case escalated', `/case/${id}`)
    return json({ ok: true })
  }

  const checkMatch = p.match(/^\/api\/cases\/([^/]+)\/checks\/([^/]+)$/)
  if (checkMatch && method === 'PATCH') {
    const id = decodeURIComponent(checkMatch[1])
    const checkId = decodeURIComponent(checkMatch[2])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    const st = (body as { state?: string })?.state?.toLowerCase()
    const chk = c.checks.find((k) => k.id === checkId)
    if (!chk) return json({ error: 'Check not found' }, 404)
    if (st === 'passed') chk.state = 'passed'
    else if (st === 'failed') chk.state = 'failed'
    else chk.state = 'review'
    c.timeline.unshift({
      at: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'A. Officer',
      text: `Check "${chk.name}" updated.`,
    })
    logActivity('Compliance check updated', `/case/${id}`)
    return json({ ok: true })
  }

  const decMatch = p.match(/^\/api\/cases\/([^/]+)\/decisions$/)
  if (decMatch && method === 'POST') {
    const id = decodeURIComponent(decMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    const t = (body as { type?: string })?.type
    if (t === 'APPROVE') {
      c.status = 'approved'
      c.sla = 'Closed'
      c.slaUrgent = false
      c.timeline.unshift({
        at: new Date().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        actor: 'A. Officer',
        text: 'Approved.',
      })
      logActivity('Case approved', `/case/${id}`)
    } else if (t === 'REJECT') {
      const reason = (body as { reasonCode?: string })?.reasonCode ?? 'policy'
      c.status = 'rejected'
      c.sla = 'Closed'
      c.slaUrgent = false
      c.timeline.unshift({
        at: new Date().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        actor: 'A. Officer',
        text: `Rejected (${reason}).`,
      })
      logActivity('Case rejected', `/case/${id}`)
    } else {
      c.status = 'in_review'
      c.timeline.unshift({
        at: new Date().toLocaleString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        actor: 'A. Officer',
        text: 'More information requested.',
      })
      logActivity('More info requested', `/case/${id}`)
    }
    return json({ ok: true }, 201)
  }

  const docMatch = p.match(/^\/api\/cases\/([^/]+)\/documents$/)
  if (docMatch && method === 'POST') {
    const id = decodeURIComponent(docMatch[1])
    const c = state.cases[id]
    if (!c) return json({ error: 'Case not found' }, 404)
    let name = 'upload.bin'
    if (init.body instanceof FormData) {
      const f = init.body.get('file')
      if (f instanceof File) name = f.name
    }
    const docId = nextId('doc')
    c.documents.unshift({
      id: docId,
      name,
      date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      size: '42 KB',
    })
    c.timeline.unshift({
      at: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      actor: 'System',
      text: `Document uploaded: ${name}.`,
    })
    logActivity('Document uploaded', `/case/${id}`)
    return json({ id: docId, name, virusScanStatus: 'CLEAN' }, 201)
  }

  const dlMatch = p.match(/^\/api\/cases\/([^/]+)\/documents\/([^/]+)\/download$/)
  if (dlMatch && method === 'GET') {
    const cid = decodeURIComponent(dlMatch[1])
    const did = decodeURIComponent(dlMatch[2])
    const fn = state.cases[cid]?.documents.find((d) => d.id === did)?.name ?? 'file.bin'
    return new Response(new Blob([`Mock file content: ${fn}\n`], { type: 'application/octet-stream' }), {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    })
  }

  if (p === '/api/incidents' && method === 'GET') {
    return json(state.incidents)
  }
  if (p === '/api/incidents' && method === 'POST') {
    const b = body as { category?: string; title?: string; description?: string }
    const row: Incident = {
      id: nextId('inc'),
      reference: `INC-${Date.now().toString(36).toUpperCase()}`,
      category: b.category ?? 'OTHER',
      status: 'OPEN',
      title: b.title ?? 'Untitled',
      createdAt: new Date().toISOString(),
    }
    state.incidents.unshift(row)
    logActivity('Incident opened', '/reports')
    return json(row, 201)
  }
  const incPatch = p.match(/^\/api\/incidents\/([^/]+)$/)
  if (incPatch && method === 'PATCH') {
    const row = state.incidents.find((i) => i.id === incPatch[1])
    if (!row) return json({ error: 'Not found' }, 404)
    const st = (body as { status?: string })?.status
    if (st) row.status = st
    logActivity('Incident updated', '/reports')
    return json(row)
  }

  if (p === '/api/business-kyc' && method === 'GET') {
    return json(state.kyc)
  }
  if (p === '/api/business-kyc' && method === 'POST') {
    const b = body as Record<string, string>
    const row: KycRow = {
      id: nextId('kyc'),
      businessName: b.businessName ?? 'New',
      rcNumber: b.rcNumber ?? '',
      status: 'DRAFT',
      email: b.email ?? '',
      submittedAt: null,
    }
    state.kyc.unshift(row)
    logActivity('Business KYC draft saved', '/customers')
    return json(row, 201)
  }
  const kycPatch = p.match(/^\/api\/business-kyc\/([^/]+)$/)
  if (kycPatch && method === 'PATCH') {
    const row = state.kyc.find((k) => k.id === kycPatch[1])
    if (!row) return json({ error: 'Not found' }, 404)
    const st = (body as { status?: string })?.status
    if (st) {
      row.status = st
      if (st === 'PENDING_REVIEW') row.submittedAt = new Date().toISOString()
    }
    logActivity('Business KYC updated', '/customers')
    return json(row)
  }

  if (p === '/api/vendors' && method === 'GET') {
    return json(state.vendors)
  }
  if (p === '/api/vendors' && method === 'POST') {
    const b = body as { name?: string; contactEmail?: string }
    const row: Vendor = {
      id: nextId('v'),
      name: b.name ?? 'Vendor',
      contactEmail: b.contactEmail ?? null,
      notes: null,
    }
    state.vendors.push(row)
    logActivity('Processor added', '/settings')
    return json(row, 201)
  }

  if (p === '/api/consents' && method === 'GET') {
    return json(state.consents)
  }
  if (p === '/api/consents' && method === 'POST') {
    const b = body as { subjectRef?: string; purpose?: string; version?: string }
    const row: Consent = {
      id: nextId('c'),
      subjectRef: b.subjectRef ?? '',
      purpose: b.purpose ?? '',
      version: b.version ?? 'v1',
      withdrawnAt: null,
    }
    state.consents.unshift(row)
    logActivity('Consent recorded', '/settings')
    return json(row, 201)
  }
  const consentW = p.match(/^\/api\/consents\/([^/]+)\/withdraw$/)
  if (consentW && method === 'PATCH') {
    const row = state.consents.find((c) => c.id === consentW[1])
    if (!row) return json({ error: 'Not found' }, 404)
    row.withdrawnAt = new Date().toISOString()
    logActivity('Consent withdrawn', '/settings')
    return json({ ok: true })
  }

  if (p === '/api/dsar' && method === 'GET') {
    return json(state.dsars)
  }
  if (p === '/api/dsar' && method === 'POST') {
    const b = body as { type?: string; subjectRef?: string }
    const row: Dsar = {
      id: nextId('d'),
      type: b.type ?? 'ACCESS',
      status: 'RECEIVED',
      subjectRef: b.subjectRef ?? '',
      createdAt: new Date().toISOString(),
    }
    state.dsars.unshift(row)
    logActivity('DSAR created', '/settings')
    return json(row, 201)
  }
  const dsarPatch = p.match(/^\/api\/dsar\/([^/]+)$/)
  if (dsarPatch && method === 'PATCH') {
    const row = state.dsars.find((d) => d.id === dsarPatch[1])
    if (!row) return json({ error: 'Not found' }, 404)
    const st = (body as { status?: string })?.status
    if (st) row.status = st
    logActivity('DSAR updated', '/settings')
    return json(row)
  }

  return json({ error: `Mock API: unhandled ${method} ${p}` }, 501)
}

export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_USE_REAL_API !== 'true'
}
