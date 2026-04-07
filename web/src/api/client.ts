const TOKEN_KEY = 'savvybee_compliance_token'

/** Production API origin (set in Vercel: VITE_API_URL). Dev: empty → same-origin /api via Vite proxy. */
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export type ApiError = { error: string; details?: unknown }

function redirectLogin() {
  clearToken()
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login'
  }
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const url = apiUrl(path)
  const res = await fetch(url, { ...init, headers })
  if (res.status === 401 && !url.includes('/api/auth/login')) redirectLogin()
  return res
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ApiError
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function login(email: string, password: string) {
  const data = await apiJson<{ token: string; user: { id: string; email: string; name: string; role: string } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  )
  setToken(data.token)
  return data.user
}

export async function downloadCaseDocument(casePublicId: string, documentId: string, filename: string) {
  const res = await apiFetch(`/api/cases/${casePublicId}/documents/${documentId}/download`)
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
