import { NavLink, Outlet } from 'react-router-dom'
import { AlertTriangle, FileSearch, LayoutGrid, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isMockApiEnabled } from '../api/client'
import { GlobalCaseSearch } from '../components/GlobalCaseSearch'
import { NotificationsMenu } from '../components/NotificationsMenu'

const nav = [
  { to: '/', icon: LayoutGrid, label: 'Queue', end: true },
  { to: '/customers', icon: FileSearch, label: 'Customers' },
  { to: '/reports', icon: AlertTriangle, label: 'Incidents' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function AppShell() {
  const { user } = useAuth()

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <aside
        className="fixed left-0 top-0 z-30 flex h-screen w-[4.5rem] flex-col items-center bg-surface-low/90 py-6 backdrop-blur-xl"
        aria-label="Primary"
      >
        <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-primary bg-gradient-to-br from-primary to-primary-mid shadow-[0_12px_32px_rgba(20,27,43,0.06)]">
          <span className="text-base font-semibold text-white">S</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'group relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
                  isActive
                    ? 'bg-surface-high text-primary'
                    : 'text-on-variant hover:bg-surface-float/80 hover:text-on-surface',
                ].join(' ')
              }
              title={label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto max-w-[3rem] text-center text-[0.6rem] font-medium uppercase tracking-wider text-on-variant">
          v0.2
        </p>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pl-[4.5rem]">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-6 bg-surface/80 px-8 py-4 backdrop-blur-xl">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-on-variant">Savvy Bee</p>
            <h1 className="text-lg font-semibold tracking-tight text-on-surface">Compliance OS</h1>
            {isMockApiEnabled() && (
              <p className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-attention">
                Mock MVP · no database
              </p>
            )}
          </div>
          <GlobalCaseSearch />
          <div className="flex items-center gap-4">
            <NotificationsMenu />
            <div className="flex items-center gap-3 rounded-xl bg-surface-low px-3 py-2">
              <div className="h-9 w-9 rounded-full bg-surface-high" aria-hidden />
              <div className="text-left text-sm">
                <p className="font-medium text-on-surface">{user?.name ?? '—'}</p>
                <p className="text-xs text-on-variant">{user?.role?.replace('_', ' ') ?? ''}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-8 pb-32 pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
