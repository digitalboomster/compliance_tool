export interface CaseDto {
  id: string
  customer: string
  type: string
  risk: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_review' | 'escalated' | 'approved' | 'rejected'
  opened: string
  sla: string
  slaUrgent?: boolean
  country?: string
  phoneMasked?: string
  application?: string
  documents: { id: string; name: string; date: string; size: string }[]
  checks: { name: string; state: 'passed' | 'review' | 'failed'; detail?: string }[]
  timeline: { at: string; actor: string; text: string }[]
  riskFactors: { label: string; level: string; highlight?: boolean }[]
}

export interface QueueSummary {
  openCases: number
  dueToday: number
  escalated: number
  autoCleared24h: number
  efficiencyPct: number
}
