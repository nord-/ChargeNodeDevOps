import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthState {
  organization: string
  token: string
}

interface AuthContextValue {
  auth: AuthState | null
  login: (organization: string, token: string) => void
  logout: () => void
}

const STORAGE_KEY = 'cn-devops-auth'

function loadAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.organization && parsed.token) return parsed
  } catch { /* ignore corrupt data */ }
  return null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(loadAuth)

  const login = useCallback((organization: string, token: string) => {
    const state = { organization, token }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    setAuth(state)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
