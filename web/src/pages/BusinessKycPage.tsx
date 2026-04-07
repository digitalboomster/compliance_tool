import { useEffect, useState } from 'react'
import { apiJson } from '../api/client'

type Row = {
  id: string
  businessName: string
  rcNumber: string
  status: string
  email: string
  submittedAt: string | null
}

export function BusinessKycPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    businessName: '',
    rcNumber: '',
    physicalAddress: '',
    email: '',
    phone: '',
    websiteUrl: '',
    natureOfBusiness: '',
  })

  async function refresh() {
    const data = await apiJson<Row[]>('/api/business-kyc')
    setRows(data)
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  async function createDraft(e: React.FormEvent) {
    e.preventDefault()
    await apiJson('/api/business-kyc', {
      method: 'POST',
      body: JSON.stringify(form),
    })
    setForm({
      businessName: '',
      rcNumber: '',
      physicalAddress: '',
      email: '',
      phone: '',
      websiteUrl: '',
      natureOfBusiness: '',
    })
    await refresh()
  }

  async function submitReview(id: string) {
    await apiJson(`/api/business-kyc/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PENDING_REVIEW' }),
    })
    await refresh()
  }

  if (loading) return <p className="text-on-variant">Loading…</p>

  return (
    <div className="mx-auto max-w-[1000px] space-y-10">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface">Business KYC</h2>
        <p className="mt-2 text-sm text-on-variant">
          Company onboarding (spec domain 1 — Savvy Bee as corporate entity). BVN verification API to be
          connected in production.
        </p>
      </div>

      <form onSubmit={createDraft} className="rounded-2xl bg-surface-low/80 p-6 shadow-[inset_0_0_0_1px_rgba(43,75,185,0.06)]">
        <h3 className="text-sm font-semibold text-on-surface">New application (draft)</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['businessName', 'Business name'],
              ['rcNumber', 'RC number'],
              ['physicalAddress', 'Physical address'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['websiteUrl', 'Website URL'],
              ['natureOfBusiness', 'Nature of business'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-xs font-medium uppercase tracking-wide text-on-variant">
              {label}
              <input
                required={key !== 'websiteUrl'}
                className="mt-1 w-full rounded-md bg-surface-float px-3 py-2 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="mt-6 rounded-md bg-gradient-to-br from-primary to-primary-mid px-4 py-2 text-sm font-medium text-white"
        >
          Save draft
        </button>
      </form>

      <div className="rounded-2xl bg-surface-float/90 p-2 shadow-[0_12px_32px_rgba(20,27,43,0.04)]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[0.7rem] uppercase tracking-wide text-on-variant">
              <th className="p-4">Business</th>
              <th className="p-4">RC</th>
              <th className="p-4">Status</th>
              <th className="p-4">Email</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-primary/5">
                <td className="p-4 font-medium text-on-surface">{r.businessName}</td>
                <td className="p-4 text-on-variant">{r.rcNumber}</td>
                <td className="p-4 text-on-variant">{r.status}</td>
                <td className="p-4 text-on-variant">{r.email}</td>
                <td className="p-4 text-right">
                  {r.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => submitReview(r.id)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Submit for review
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-on-variant">No applications yet.</p>}
      </div>
    </div>
  )
}
