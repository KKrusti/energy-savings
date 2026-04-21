import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { AuthUser } from '@/types'
import { authApi } from '@/api/auth'
import { clearStoredToken, getStoredToken, setStoredToken } from '@/api/client'

const USER_KEY = 'auth_user'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadPersistedUser(): { user: AuthUser; token: string } | null {
  try {
    const token = getStoredToken()
    const raw = localStorage.getItem(USER_KEY)
    if (!token || !raw) return null
    return { token, user: JSON.parse(raw) as AuthUser }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const persisted = loadPersistedUser()
  const [user, setUser] = useState<AuthUser | null>(persisted?.user ?? null)
  const [token, setToken] = useState<string | null>(persisted?.token ?? null)

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    setStoredToken(newToken)
    localStorage.setItem(USER_KEY, JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(async () => {
    const currentToken = getStoredToken()
    if (currentToken) {
      await authApi.logout(currentToken).catch(() => {})
    }
    clearStoredToken()
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // Handle session expiry signalled by the API client (401 responses)
  useEffect(() => {
    const handler = () => {
      clearStoredToken()
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
