import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiJson } from '../api/client'
import type { CaseDto, QueueSummary } from '../types/api'
import { Sparkline } from '../components/Sparkline'

function riskStyles(risk: string) {
  if (risk === 'high') return 'bg-destructive/10 text-destructive'
  if (risk === 'medium') return 'bg-attention/10 text-attention'
  return 'bg-success/10 text-success'
}

function statusDot(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-on-variant/40',
    in_review: 'bg-primary',
    escalated: 'bg-destructive',
    approved: 'bg-success',
    rejected: 'bg-on-variant/50',
  }
  return map[status] ?? 'bg-on-variant/40'
}

export function QueuePage() {
  const [cases, setCases] = useState<CaseDto[] | null>(null)
  const [summary, setSummary] = useState<QueueSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cRows, s] = await Promise.all([
          apiJson<CaseDto[]>('/api/cases'),
          apiJson<QueueSummary>('/api/stats/queue-summary'),
        ])
        if (!cancelled) {
          setCases(cRows)
          setSummary(s)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load queue')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl bg-destructive/10 px-6 py-8 text-center text-destructive">
        {error}
        <p className="mt-2 text-sm text-on-variant">Is the API running on port 3000?</p>
      </div>
    )
  }

  if (!cases || !summary) {
    return <div className="text-on-variant">Loading queue…</div>
  }

  return (
    <div className="mx-auto max-w-[1400px]">
      <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-sm text-on-variant">Operations</p>
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface">Compliance queue</h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-variant">
            Review entity validations and high-priority flags. Decisions are logged under your officer ID.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-on-variant">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          Live monitoring
        </div>
      </header>

      <section
        className="mb-10 grid grid-cols-2 gap-0 overflow-hidden rounded-2xl bg-surface-low shadow-[inset_0_0_0_1px_rgba(43,75,185,0.06)] lg:grid-cols-4 lg:divide-x lg:divide-primary/10"
        aria-label="Queue summary"
      >
        {[
          { label: 'Open cases', value: summary.openCases, hint: 'Active in queue', spark: true },
          { label: 'Due today', value: summary.dueToday, hint: 'SLA window today', warn: true },
          { label: 'Escalated', value: summary.escalated, hint: 'Needs senior sign-off' },
          {
            label: 'Auto-cleared (24h)',
            value: summary.autoCleared24h,
            hint: `Efficiency ${summary.efficiencyPct}%`,
          },
        ].map((item) => (
          <div key={item.label} className="flex flex-col justify-center gap-1 px-6 py-5">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-on-variant">{item.label}</p>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold tabular-nums text-on-surface">{item.value}</span>
              {item.spark && <Sparkline className="h-4 w-12" />}
            </div>
            <p className={`text-xs ${item.warn ? 'text-attention' : 'text-on-variant/80'}`}>{item.hint}</p>
          </div>
        ))}
      </section>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select
          className="rounded-md bg-surface-float px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
          defaultValue="all"
          aria-label="Filter by status"
        >
          <option value="all">Status: All</option>
          <option value="pending">Pending</option>
          <option value="in_review">In review</option>
          <option value="escalated">Escalated</option>
        </select>
        <select
          className="rounded-md bg-surface-float px-3 py-2 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
          defaultValue="all"
          aria-label="Filter by risk"
        >
          <option value="all">Risk: All</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          type="button"
          className="rounded-md bg-gradient-to-br from-primary to-primary-mid px-4 py-2 text-sm font-medium text-white shadow-[0_12px_32px_rgba(43,75,185,0.25)]"
        >
          Apply filters
        </button>
      </div>

      <div className="rounded-2xl bg-surface-float/80 p-2 shadow-[0_12px_32px_rgba(20,27,43,0.04)]">
        <div className="overflow-x-auto rounded-xl">
          <table className="w-full min-w-[800px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-[0.7rem] font-medium uppercase tracking-[0.08em] text-on-variant">
                <th className="px-4 pb-4 pl-5 pt-3">Case ID</th>
                <th className="px-4 pb-4 pt-3">Customer</th>
                <th className="px-4 pb-4 pt-3">Type</th>
                <th className="px-4 pb-4 pt-3">Risk</th>
                <th className="px-4 pb-4 pt-3">Status</th>
                <th className="px-4 pb-4 pt-3">Opened</th>
                <th className="px-4 pb-4 pt-3 text-right">SLA</th>
                <th className="px-4 pb-4 pr-5 pt-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((row, idx) => (
                <tr
                  key={row.id}
                  className={
                    idx % 2 === 0
                      ? 'bg-surface-low/50 hover:bg-surface-high/60'
                      : 'bg-surface-float/90 hover:bg-surface-high/60'
                  }
                >
                  <td className="rounded-l-xl px-4 py-4 pl-5 align-middle">
                    <Link to={`/case/${row.id}`} className="font-medium text-primary hover:underline">
                      {row.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 align-middle text-on-surface">{row.customer}</td>
                  <td className="px-4 py-4 align-middle text-on-variant">{row.type}</td>
                  <td className="px-4 py-4 align-middle">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${riskStyles(row.risk)}`}
                    >
                      {row.risk}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <span className="inline-flex items-center gap-2 text-on-surface">
                      <span className={`h-2 w-2 rounded-full ${statusDot(row.status)}`} />
                      {row.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-middle tabular-nums text-on-variant">{row.opened}</td>
                  <td
                    className={`px-4 py-4 text-right align-middle tabular-nums ${row.slaUrgent ? 'font-semibold text-destructive' : 'text-on-surface'}`}
                  >
                    {row.sla}
                  </td>
                  <td className="rounded-r-xl px-4 py-4 pr-5 text-right align-middle">
                    <Link
                      to={`/case/${row.id}`}
                      className={
                        row.slaUrgent
                          ? 'inline-flex rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/15'
                          : 'text-sm font-medium text-primary hover:underline'
                      }
                    >
                      {row.slaUrgent ? 'Urgent open' : 'Open'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
