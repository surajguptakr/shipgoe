import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch, getToken, setToken } from '../api/client'

type Role = 'customer' | 'partner'

type User = {
  id: number
  role: Role
  email: string | null
  phone: string | null
}

type AuthState =
  | { kind: 'anonymous' }
  | { kind: 'loading' }
  | { kind: 'authenticated'; user: User; token: string }

type AuthApi = {
  state: AuthState
  login: (args: { role: Role; identifier: string; password: string }) => Promise<void>
  register: (args: { role: Role; identifier: string; password: string }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthApi | null>(null)

function parseIdentifier(identifier: string): { email?: string; phone?: string } {
  const trimmed = identifier.trim()
  if (trimmed.includes('@')) return { email: trimmed }
  return { phone: trimmed }
}

export function AuthProvider(props: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ kind: 'anonymous' })

  const hydrate = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setState({ kind: 'anonymous' })
      return
    }
    setState({ kind: 'loading' })
    try {
      const me = await apiFetch<{ user: User }>('/api/me', { auth: true })
      setState({ kind: 'authenticated', user: me.user, token })
    } catch {
      setToken(null)
      setState({ kind: 'anonymous' })
    }
  }, [])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const login = useCallback(
    async (args: { role: Role; identifier: string; password: string }) => {
      const { email, phone } = parseIdentifier(args.identifier)
      const res = await apiFetch<{ token: string }>('/api/auth/login', {
        method: 'POST',
        json: { email, phone, password: args.password },
      })
      setToken(res.token)
      await hydrate()
    },
    [hydrate],
  )

  const register = useCallback(
    async (args: { role: Role; identifier: string; password: string }) => {
      const { email, phone } = parseIdentifier(args.identifier)
      const res = await apiFetch<{ token: string }>('/api/auth/register', {
        method: 'POST',
        json: { role: args.role, email, phone, password: args.password },
      })
      setToken(res.token)
      await hydrate()
    },
    [hydrate],
  )

  const logout = useCallback(() => {
    setToken(null)
    setState({ kind: 'anonymous' })
  }, [])

  const value = useMemo<AuthApi>(() => ({ state, login, register, logout }), [login, logout, register, state])
  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

