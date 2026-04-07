import { useEffect, useState } from 'react'
import { apiJson } from '../api/client'

type Incident = {
  id: string
  reference: string
  category: string
  status: string
  title: string
  createdAt: string
}

const categories = [
  'API_INTEGRATION',
  'WALLET_DEBIT',
  'WRONG_AIRTIME_DATA',
  'WRONG_TV',
  'TOKEN_ERROR',
  'VALUE_MISMATCH',
  'DOWNTIME',
  'FUNDING',
  'OTHER',
] as const

export function IncidentsPage() {
  const [rows, setRows] = useState<Incident[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('API_INTEGRATION')
  const [desc, setDesc] = useState('')

  async function refresh() {
    const data = await apiJson<Incident[]>('/api/incidents')
    setRows(data)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function create(e: React.FormEvent) {
    e.preventDefault()
    await apiJson('/api/incidents', {
      method: 'POST',
      body: JSON.stringify({ category, title, description: desc || undefined }),
    })
    setTitle('')
    setDesc('')
    await refresh()
  }

  async function resolve(id: string) {
    await apiJson(`/api/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'RESOLVED' }),
    })
    await refresh()
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-10">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface">Incidents & escalations</h2>
        <p className="mt-2 text-sm text-on-variant">
          SLA matrix (spec domain 5 / clause 28). Track API, wallet, token, and funding issues.
        </p>
      </div>

      <form onSubmit={create} className="rounded-2xl bg-surface-low/80 p-6">
        <h3 className="text-sm font-semibold text-on-surface">Open ticket</h3>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}
            className="rounded-md bg-surface-float px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="flex-1 rounded-md bg-surface-float px-3 py-2 text-sm"
          />
        </div>
        <textarea
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="mt-3 w-full rounded-md bg-surface-float px-3 py-2 text-sm"
          rows={2}
        />
        <button
          type="submit"
          className="mt-4 rounded-md bg-gradient-to-br from-primary to-primary-mid px-4 py-2 text-sm font-medium text-white"
        >
          Create incident
        </button>
      </form>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-float/90 p-4 shadow-[inset_0_0_0_1px_rgba(20,27,43,0.06)]"
          >
            <div>
              <p className="font-mono text-xs text-on-variant">{r.reference}</p>
              <p className="font-medium text-on-surface">{r.title}</p>
              <p className="text-xs text-on-variant">
                {r.category.replace(/_/g, ' ')} · {r.status}
              </p>
            </div>
            {r.status !== 'RESOLVED' && (
              <button
                type="button"
                onClick={() => resolve(r.id)}
                className="text-sm font-medium text-success hover:underline"
              >
                Mark resolved
              </button>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-center text-sm text-on-variant">No incidents logged.</p>}
    </div>
  )
}
