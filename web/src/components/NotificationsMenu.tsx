import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { apiJson } from '../api/client'

type ActivityItem = {
  id: string
  title: string
  subtitle: string
  href: string | null
  createdAt: string
}

type ActivityResponse = { items: ActivityItem[]; openIncidents: number }

function formatAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return 'Just now'
  const m = Math.floor(sec / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [err, setErr] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [])

  async function load() {
    setErr('')
    try {
      const res = await apiJson<ActivityResponse>('/api/activity/recent')
      setData(res)
    } catch {
      setErr('Could not load activity')
    }
  }

  useEffect(() => {
    if (open) void load()
  }, [open])

  const showDot = (data?.openIncidents ?? 0) > 0

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-on-variant hover:bg-surface-low"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Activity and alerts"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {showDot && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-attention" aria-hidden />
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-xl border border-primary/10 bg-surface-float py-2 shadow-xl"
          role="dialog"
          aria-label="Recent activity"
        >
          {data && data.openIncidents > 0 && (
            <div className="mx-2 mb-2 rounded-lg bg-attention/10 px-3 py-2 text-sm">
              <span className="font-medium text-attention">{data.openIncidents} open incident(s)</span>
              <Link
                to="/reports"
                className="ml-2 font-medium text-primary hover:underline"
                onClick={() => setOpen(false)}
              >
                View
              </Link>
            </div>
          )}
          <p className="px-4 pb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-on-variant">
            Recent audit activity
          </p>
          {err && <p className="px-4 py-2 text-sm text-destructive">{err}</p>}
          {!data && !err && <p className="px-4 py-3 text-sm text-on-variant">Loading…</p>}
          {data && data.items.length === 0 && !err && (
            <p className="px-4 py-3 text-sm text-on-variant">No recent events yet.</p>
          )}
          <ul className="max-h-72 overflow-y-auto">
            {data?.items.map((item) => (
              <li key={item.id} className="border-t border-primary/5 first:border-t-0">
                {item.href ? (
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-left hover:bg-surface-low"
                  >
                    <p className="text-sm font-medium text-on-surface">{item.title}</p>
                    <p className="text-xs text-on-variant">
                      {item.subtitle} · {formatAgo(item.createdAt)}
                    </p>
                  </Link>
                ) : (
                  <div className="px-4 py-2.5">
                    <p className="text-sm font-medium text-on-surface">{item.title}</p>
                    <p className="text-xs text-on-variant">
                      {item.subtitle} · {formatAgo(item.createdAt)}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
