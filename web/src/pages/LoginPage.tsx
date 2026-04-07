import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('officer@savvybee.internal')
  const [password, setPassword] = useState('ChangeMe!123')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      await login(email, password)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(
        msg === 'Invalid email or password'
          ? 'Invalid email or password.'
          : `Sign-in failed: ${msg}. New Vercel databases need migrations and seed — see README (prisma migrate deploy + prisma db seed).`,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface-float p-8 shadow-[0_12px_32px_rgba(20,27,43,0.08)]">
        <h1 className="text-xl font-semibold text-on-surface">Savvy Bee</h1>
        <p className="mt-1 text-sm text-on-variant">Compliance OS — sign in</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-on-variant">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md bg-surface-low px-3 py-2.5 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-on-variant">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md bg-surface-low px-3 py-2.5 text-sm shadow-[inset_0_0_0_1px_rgba(20,27,43,0.08)]"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-gradient-to-br from-primary to-primary-mid py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-on-variant">
          Single-tenant: Savvy Bee Limited · SB-COMP-SPEC-2026-001
        </p>
      </div>
    </div>
  )
}
