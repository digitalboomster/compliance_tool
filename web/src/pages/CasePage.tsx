import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, FileText, Gavel, X } from 'lucide-react'
import { apiFetch, apiJson, downloadCaseDocument } from '../api/client'
import type { CaseDto } from '../types/api'

type Tab = 'documents' | 'checks' | 'timeline'

export function CasePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [c, setC] = useState<CaseDto | null>(null)
  const [loadError, setLoadError] = useState('')
  const [tab, setTab] = useState<Tab>('documents')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectDetail, setRejectDetail] = useState('')
  const [rejectTouched, setRejectTouched] = useState(false)
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoadError('')
    try {
      const row = await apiJson<CaseDto>(`/api/cases/${encodeURIComponent(id)}`)
      setC(row)
    } catch {
      setC(null)
      setLoadError('Case not found or failed to load.')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!id) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-surface-low px-8 py-12 text-center">
        <p className="text-lg font-medium text-on-surface">Invalid case link</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to queue
        </Link>
      </div>
    )
  }

  const closed = c?.status === 'approved' || c?.status === 'rejected'
  const rejectInvalid = rejectOpen && rejectTouched && !rejectReason

  async function saveNote() {
    if (!c || !noteBody.trim()) return
    setSaving(true)
    try {
      await apiJson(`/api/cases/${encodeURIComponent(c.id)}/notes`, {
        method: 'POST',
        body: JSON.stringify({ body: noteBody.trim() }),
      })
      setNoteBody('')
      await load()
    } finally {
      setSaving(false)
    }
  }

  async function assignToMe() {
    if (!c) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/assign`, { method: 'POST', body: '{}' })
    await load()
  }

  async function escalateCase() {
    if (!c) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/escalate`, { method: 'POST', body: '{}' })
    await load()
  }

  async function patchCheck(checkId: string, state: 'PASSED' | 'REVIEW' | 'FAILED') {
    if (!c) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/checks/${encodeURIComponent(checkId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ state }),
    })
    await load()
  }

  async function approve() {
    if (!c) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'APPROVE' }),
    })
    navigate('/')
  }

  async function requestInfo() {
    if (!c) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/decisions`, {
      method: 'POST',
      body: JSON.stringify({ type: 'REQUEST_INFO' }),
    })
    navigate('/')
  }

  async function confirmReject() {
    if (!c) return
    setRejectTouched(true)
    if (!rejectReason) return
    await apiJson(`/api/cases/${encodeURIComponent(c.id)}/decisions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'REJECT',
        reasonCode: rejectReason,
        detail: rejectDetail || undefined,
      }),
    })
    setRejectOpen(false)
    setRejectReason('')
    setRejectDetail('')
    setRejectTouched(false)
    navigate('/')
  }

  async function onUploadFile(file: File | null) {
    if (!c || !file) return
    const fd = new FormData()
    fd.append('file', file)
    const res = await apiFetch(`/api/cases/${encodeURIComponent(c.id)}/documents`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert((err as { error?: string }).error ?? 'Upload failed')
      return
    }
    await load()
  }

  if (loadError || (!c && !loadError)) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-surface-low px-8 py-12 text-center">
        <p className="text-lg font-medium text-on-surface">{loadError || 'Loading…'}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Back to queue
        </Link>
      </div>
    )
  }

  if (!c) return null

  return (
    <div className="mx-auto max-w-[1200px] pb-28">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-on-variant" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">
          Queue
        </Link>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
        <span className="text-on-surface">Case {c.id}</span>
      </nav>

      <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-on-variant">
            Case profile · Savvy Bee Limited
          </p>
          <h2 className="mt-1 font-mono text-2xl font-semibold tracking-tight text-on-surface">{c.id}</h2>
          <p className="mt-2 text-sm text-on-variant">
            {c.customer}
            {c.application ? ` · ${c.application}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              {c.status.replace('_', ' ')}
            </span>
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${
                c.risk === 'high'
                  ? 'bg-destructive/10 text-destructive'
                  : c.risk === 'medium'
                    ? 'bg-attention/10 text-attention'
                    : 'bg-success/10 text-success'
              }`}
            >
              {c.risk} risk
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={closed || c.status === 'escalated'}
            onClick={escalateCase}
            className="rounded-md bg-surface-float px-4 py-2.5 text-sm font-medium text-on-surface shadow-[inset_0_0_0_1px_rgba(20,27,43,0.12)] hover:bg-surface-high/50 disabled:opacity-50"
          >
            {c.status === 'escalated' ? 'Escalated' : 'Escalate'}
          </button>
          <button
            type="button"
            disabled={closed}
            onClick={assignToMe}
            className="rounded-md bg-gradient-to-br from-primary to-primary-mid px-4 py-2.5 text-sm font-medium text-white shadow-[0_12px_32px_rgba(43,75,185,0.22)] disabled:opacity-50"
          >
            Assign to me
          </button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <div className="rounded-2xl bg-surface-low/80 p-1 shadow-[inset_0_0_0_1px_rgba(43,75,185,0.05)]">
            <div className="flex gap-1 rounded-xl bg-surface/50 p-1">
              {(
                [
                  ['documents', 'Documents'],
                  ['checks', 'Checks'],
                  ['timeline', 'Timeline'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? 'bg-surface-float text-on-surface shadow-[0_4px_20px_rgba(20,27,43,0.06)]'
                      : 'text-on-variant hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {tab === 'documents' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-on-surface">
                    Upload document
                    <input
                      type="file"
                      className="mt-2 block w-full text-sm text-on-variant file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
                      disabled={closed}
                      onChange={(e) => onUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <ul className="space-y-3">
                    {c.documents.length === 0 && (
                      <li className="text-sm text-on-variant">No documents uploaded yet.</li>
                    )}
                    {c.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-surface-float/90 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(20,27,43,0.06)]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <FileText className="h-5 w-5 shrink-0 text-primary/70" strokeWidth={1.5} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-on-surface">{doc.name}</p>
                            <p className="text-xs text-on-variant">
                              {doc.date} · {doc.size}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadCaseDocument(c.id, doc.id, doc.name)}
                          className="shrink-0 text-sm font-medium text-primary hover:underline"
                        >
                          Download
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab === 'checks' && (
                <ul className="space-y-4">
                  {c.checks.map((check) => (
                    <li
                      key={check.id}
                      className="rounded-xl bg-surface-float/90 p-4 shadow-[inset_0_0_0_1px_rgba(20,27,43,0.06)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-on-surface">{check.name}</span>
                        <span
                          className={`text-xs font-semibold uppercase tracking-wide ${
                            check.state === 'passed'
                              ? 'text-success'
                              : check.state === 'review'
                                ? 'text-attention'
                                : 'text-destructive'
                          }`}
                        >
                          {check.state === 'passed'
                            ? 'Passed'
                            : check.state === 'review'
                              ? 'Review required'
                              : 'Failed'}
                        </span>
                      </div>
                      {check.detail && (
                        <p className="mt-2 text-sm leading-relaxed text-on-variant">{check.detail}</p>
                      )}
                      {check.state === 'review' && !closed && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => patchCheck(check.id, 'PASSED')}
                            className="rounded-md bg-success/15 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/25"
                          >
                            Mark false positive
                          </button>
                          <button
                            type="button"
                            onClick={escalateCase}
                            className="rounded-md bg-surface-high px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-high/80"
                          >
                            Escalate to senior
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {tab === 'timeline' && (
                <ol className="space-y-6 border-l-2 border-primary/15 pl-6">
                  {c.timeline.map((ev) => (
                    <li key={ev.at + ev.text} className="relative">
                      <span className="absolute -left-[calc(1.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/40 ring-4 ring-surface-low" />
                      <p className="text-xs font-medium uppercase tracking-wide text-on-variant">{ev.at}</p>
                      <p className="text-sm text-on-surface">
                        <span className="font-medium">{ev.actor}</span> — {ev.text}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-low/60 p-6 shadow-[inset_0_0_0_1px_rgba(43,75,185,0.05)]">
            <label htmlFor="note" className="text-sm font-medium text-on-surface">
              Internal notes
            </label>
            <textarea
              id="note"
              rows={4}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              disabled={closed}
              placeholder="Add a note for the next analyst…"
              className="mt-3 w-full resize-y rounded-md bg-surface-float px-4 py-3 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)] placeholder:text-on-variant/60 disabled:opacity-60"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={closed || saving || !noteBody.trim()}
                onClick={saveNote}
                className="rounded-md bg-gradient-to-br from-primary to-primary-mid px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <div>
            <p className="mb-3 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-on-variant">
              Evidence strip
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
              {c.documents.length === 0 ? (
                <div className="rounded-xl bg-surface-low px-4 py-8 text-center text-sm text-on-variant">
                  No files to preview
                </div>
              ) : (
                c.documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => downloadCaseDocument(c.id, doc.id, doc.name)}
                    className="flex min-w-[140px] shrink-0 flex-col gap-2 rounded-xl bg-surface-float p-3 text-left shadow-[inset_0_0_0_1px_rgba(20,27,43,0.06)] transition hover:bg-surface-high/40 lg:min-w-0 lg:flex-row lg:items-center"
                  >
                    <div className="flex h-16 w-full items-center justify-center rounded-lg bg-surface-low lg:h-14 lg:w-14">
                      <FileText className="h-7 w-7 text-primary/50" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-on-surface">{doc.name}</p>
                      <p className="text-[0.65rem] text-on-variant">{doc.date}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-surface-float/90 p-5 shadow-[0_12px_32px_rgba(20,27,43,0.04)]">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-on-variant">
              Risk factors
            </p>
            <ul className="mt-4 space-y-3">
              {c.riskFactors.map((rf) => (
                <li key={rf.label} className="flex items-center justify-between text-sm">
                  <span className="text-on-variant">{rf.label}</span>
                  <span
                    className={
                      rf.highlight ? 'font-medium text-destructive' : 'font-medium text-on-surface'
                    }
                  >
                    {rf.level}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div id="case-customer-profile" className="scroll-mt-28 rounded-2xl bg-surface-low/80 p-5">
            <p className="text-sm font-medium text-on-surface">{c.customer}</p>
            {c.country && <p className="mt-1 text-xs text-on-variant">{c.country}</p>}
            {c.phoneMasked && <p className="text-xs text-on-variant">{c.phoneMasked}</p>}
            {c.application && <p className="mt-3 text-xs leading-relaxed text-on-variant">{c.application}</p>}
            <p className="mt-4 text-xs text-on-variant">
              Full KYC profile integration is planned; this panel shows the data stored on the case record.
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-transparent bg-surface-float/95 py-4 pl-[calc(4.5rem+2rem)] pr-8 shadow-[0_-8px_40px_rgba(20,27,43,0.06)] backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-on-variant">
            {closed ? (
              <span className="text-on-surface">This case is closed — no further decisions.</span>
            ) : (
              <>
                Final decision logged under your officer ID · audit trail retained per SB-COMP-SPEC-2026-001
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={closed}
              onClick={requestInfo}
              className="text-sm font-medium text-on-variant hover:text-on-surface disabled:opacity-50"
            >
              Request more info
            </button>
            <button
              type="button"
              disabled={closed}
              onClick={() => {
                setRejectOpen(true)
                setRejectTouched(false)
              }}
              className="rounded-md px-4 py-2.5 text-sm font-medium text-destructive shadow-[inset_0_0_0_1px_rgba(185,28,28,0.35)] hover:bg-destructive/5 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={closed}
              onClick={approve}
              className="rounded-md bg-gradient-to-br from-primary to-primary-mid px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_32px_rgba(43,75,185,0.25)] disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      </div>

      {rejectOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/20 p-4 pb-8 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface-float p-6 shadow-[0_12px_32px_rgba(20,27,43,0.12)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                <h3 id="reject-title" className="text-lg font-semibold text-on-surface">
                  Case final decision
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false)
                  setRejectTouched(false)
                  setRejectReason('')
                  setRejectDetail('')
                }}
                className="rounded-lg p-1 text-on-variant hover:bg-surface-low"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label htmlFor="reject-reason" className="text-xs font-medium uppercase tracking-wide text-on-variant">
              Rejection reason
            </label>
            <select
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              onBlur={() => setRejectTouched(true)}
              className={`mt-2 w-full rounded-md bg-surface-low px-3 py-2.5 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)] ${rejectInvalid ? 'shadow-[inset_0_0_0_2px_rgba(185,28,28,0.5)]' : ''}`}
            >
              <option value="">Select a reason…</option>
              <option value="incomplete">Incomplete documentation</option>
              <option value="sanctions">Sanctions / watchlist match</option>
              <option value="fraud">Suspected fraud</option>
              <option value="policy">Outside policy</option>
            </select>
            {rejectInvalid && (
              <p className="mt-2 text-sm text-destructive" role="alert">
                Reason required
              </p>
            )}
            <label htmlFor="reject-detail" className="mt-4 block text-xs font-medium uppercase tracking-wide text-on-variant">
              Additional details
            </label>
            <textarea
              id="reject-detail"
              rows={3}
              value={rejectDetail}
              onChange={(e) => setRejectDetail(e.target.value)}
              className="mt-2 w-full rounded-md bg-surface-low px-3 py-2.5 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
              placeholder="Optional context for the record…"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectOpen(false)
                  setRejectTouched(false)
                  setRejectReason('')
                  setRejectDetail('')
                }}
                className="text-sm font-medium text-on-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                className="rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-white hover:opacity-95"
              >
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
