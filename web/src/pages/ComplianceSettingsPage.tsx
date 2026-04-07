import { useEffect, useState } from 'react'
import { apiJson } from '../api/client'

type Vendor = { id: string; name: string; contactEmail: string | null; notes: string | null }
type Consent = { id: string; subjectRef: string; purpose: string; version: string; withdrawnAt: string | null }
type Dsar = { id: string; type: string; status: string; subjectRef: string; createdAt: string }

export function ComplianceSettingsPage() {
  const [tab, setTab] = useState<'vendors' | 'consents' | 'dsar'>('vendors')
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [consents, setConsents] = useState<Consent[]>([])
  const [dsars, setDsars] = useState<Dsar[]>([])
  const [vName, setVName] = useState('')
  const [vEmail, setVEmail] = useState('')
  const [cRef, setCRef] = useState('')
  const [cPurpose, setCPurpose] = useState('')
  const [cVer, setCVer] = useState('v1')
  const [dType, setDType] = useState<'ACCESS' | 'ERASURE'>('ACCESS')
  const [dRef, setDRef] = useState('')

  async function load() {
    const [v, co, d] = await Promise.all([
      apiJson<Vendor[]>('/api/vendors'),
      apiJson<Consent[]>('/api/consents'),
      apiJson<Dsar[]>('/api/dsar'),
    ])
    setVendors(v)
    setConsents(co)
    setDsars(d)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="mx-auto max-w-[1000px] space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-on-surface">Compliance register</h2>
        <p className="mt-2 text-sm text-on-variant">
          Processors (spec 3.3), consent log (3.1), and data subject requests (NDPA).
        </p>
      </div>

      <div className="flex gap-2 rounded-xl bg-surface-low/80 p-1">
        {(['vendors', 'consents', 'dsar'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-surface-float text-on-surface shadow-sm' : 'text-on-variant'
            }`}
          >
            {t === 'dsar' ? 'Data subject requests' : t}
          </button>
        ))}
      </div>

      {tab === 'vendors' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await apiJson('/api/vendors', {
                method: 'POST',
                body: JSON.stringify({ name: vName, contactEmail: vEmail || undefined }),
              })
              setVName('')
              setVEmail('')
              await load()
            }}
            className="flex flex-wrap gap-3 rounded-xl bg-surface-float/90 p-4"
          >
            <input
              required
              placeholder="Vendor name"
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="Contact email"
              value={vEmail}
              onChange={(e) => setVEmail(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              Add processor
            </button>
          </form>
          <ul className="space-y-2">
            {vendors.map((v) => (
              <li key={v.id} className="rounded-lg bg-surface-low/60 px-4 py-3 text-sm">
                <span className="font-medium text-on-surface">{v.name}</span>
                {v.contactEmail && <span className="text-on-variant"> · {v.contactEmail}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'consents' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await apiJson('/api/consents', {
                method: 'POST',
                body: JSON.stringify({
                  subjectRef: cRef,
                  purpose: cPurpose,
                  version: cVer,
                  channel: 'internal',
                }),
              })
              setCRef('')
              setCPurpose('')
              await load()
            }}
            className="grid gap-3 rounded-xl bg-surface-float/90 p-4 sm:grid-cols-2"
          >
            <input
              required
              placeholder="Subject ref (internal)"
              value={cRef}
              onChange={(e) => setCRef(e.target.value)}
              className="rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Purpose"
              value={cPurpose}
              onChange={(e) => setCPurpose(e.target.value)}
              className="rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <input
              placeholder="Version"
              value={cVer}
              onChange={(e) => setCVer(e.target.value)}
              className="rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              Record consent
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {consents.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low/60 px-4 py-3">
                <span>
                  {c.subjectRef} — {c.purpose} ({c.version})
                  {c.withdrawnAt && <span className="text-destructive"> · withdrawn</span>}
                </span>
                {!c.withdrawnAt && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiJson(`/api/consents/${c.id}/withdraw`, { method: 'PATCH' })
                      await load()
                    }}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'dsar' && (
        <div className="space-y-6">
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await apiJson('/api/dsar', {
                method: 'POST',
                body: JSON.stringify({ type: dType, subjectRef: dRef }),
              })
              setDRef('')
              await load()
            }}
            className="flex flex-wrap gap-3 rounded-xl bg-surface-float/90 p-4"
          >
            <select
              value={dType}
              onChange={(e) => setDType(e.target.value as 'ACCESS' | 'ERASURE')}
              className="rounded-md bg-surface-low px-3 py-2 text-sm"
            >
              <option value="ACCESS">Access</option>
              <option value="ERASURE">Erasure</option>
            </select>
            <input
              required
              placeholder="Subject ref"
              value={dRef}
              onChange={(e) => setDRef(e.target.value)}
              className="min-w-[200px] flex-1 rounded-md bg-surface-low px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white">
              Log request
            </button>
          </form>
          <ul className="space-y-2 text-sm">
            {dsars.map((d) => (
              <li key={d.id} className="rounded-lg bg-surface-low/60 px-4 py-3">
                {d.type} · {d.subjectRef} · <span className="text-on-variant">{d.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
