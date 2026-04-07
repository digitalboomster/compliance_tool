import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiJson } from '../api/client'
import type { CaseDto } from '../types/api'

export function GlobalCaseSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [matches, setMatches] = useState<CaseDto[]>([])
  const cacheRef = useRef<CaseDto[] | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  useEffect(() => {
    function clearCache() {
      cacheRef.current = null
    }
    window.addEventListener('focus', clearCache)
    return () => window.removeEventListener('focus', clearCache)
  }, [])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) {
      setMatches([])
      return
    }
    const t = window.setTimeout(async () => {
      try {
        if (!cacheRef.current) {
          cacheRef.current = await apiJson<CaseDto[]>('/api/cases')
        }
        const all = cacheRef.current
        setMatches(
          all
            .filter(
              (c) =>
                c.id.toLowerCase().includes(q) ||
                c.customer.toLowerCase().includes(q) ||
                c.type.toLowerCase().includes(q),
            )
            .slice(0, 10),
        )
      } catch {
        setMatches([])
      }
    }, 200)
    return () => window.clearTimeout(t)
  }, [query])

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-xl flex-1 px-4">
      <label className="sr-only" htmlFor="global-search">
        Search cases
      </label>
      <input
        id="global-search"
        type="search"
        autoComplete="off"
        placeholder="Search case ID, customer, or type…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && matches[0]) {
            e.preventDefault()
            navigate(`/case/${encodeURIComponent(matches[0].id)}`)
            setOpen(false)
            setQuery('')
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        className="w-full rounded-md bg-surface-float px-4 py-2.5 text-sm text-on-surface shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)] placeholder:text-on-variant/70"
      />
      {open && query.trim().length >= 2 && (
        <div
          className="absolute left-4 right-4 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-primary/10 bg-surface-float py-1 shadow-lg"
          role="listbox"
        >
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-on-variant">No matching cases.</p>
          ) : (
            matches.map((c) => (
              <Link
                key={c.id}
                to={`/case/${encodeURIComponent(c.id)}`}
                role="option"
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                }}
                className="block px-4 py-2.5 text-left text-sm hover:bg-surface-low"
              >
                <span className="font-mono font-medium text-primary">{c.id}</span>
                <span className="mt-0.5 block text-on-variant">
                  {c.customer} · {c.type}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
