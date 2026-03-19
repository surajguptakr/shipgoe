type Json = Record<string, unknown> | unknown[] | string | number | boolean | null

function apiBase(): string {
  const raw = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:8081'
  return raw.replace(/\/+$/, '')
}

export function getToken(): string | null {
  return localStorage.getItem('shipgoe_token')
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('shipgoe_token')
  else localStorage.setItem('shipgoe_token', token)
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { json?: Json; auth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()

  if (init?.auth && token) headers.Authorization = `Bearer ${token}`
  if (init?.json !== undefined) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || res.statusText)
  }

  return (await res.json()) as T
}

