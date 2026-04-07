const TOKEN_KEY = 'savvybee_compliance_token'

/** Production API origin (set in Vercel: VITE_API_URL). Dev: empty → same-origin /api via Vite proxy. */
function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return base ? `${base}${p}` : p
}

/** Legacy token cleared on load (login removed). */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export type ApiError = { error: string; details?: unknown }

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const url = apiUrl(path)
  return fetch(url, { ...init, headers })
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ error: res.statusText }))) as ApiError
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
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
