import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export interface UserInfo {
  id: string
  email: string
  full_name: string
  role: string
  partner_id: string | null
  community_id: string | null
}

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  user: UserInfo | null
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
  isOperator: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const ADMIN_ROLES = ['super_admin', 'partner_admin', 'community_admin']
const OPERATOR_ROLES = ['operator', 'treasurer', 'reader']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem('cwip_token'),
    isAuthenticated: !!localStorage.getItem('cwip_token'),
    user: null,
  })

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setAuth((prev) => ({ ...prev, user: res.data }))
    } catch {
      // token invalid — clear it
      localStorage.removeItem('cwip_token')
      setAuth({ token: null, isAuthenticated: false, user: null })
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const token = res.data.access_token
    localStorage.setItem('cwip_token', token)
    setAuth({ token, isAuthenticated: true, user: null })
    // Fetch user info right away
    try {
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setAuth({ token, isAuthenticated: true, user: meRes.data })
    } catch {
      // proceed without user info — will retry on mount
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cwip_token')
    setAuth({ token: null, isAuthenticated: false, user: null })
  }, [])

  useEffect(() => {
    if (auth.isAuthenticated && !auth.user) {
      fetchUser()
    }
  }, [auth.isAuthenticated, auth.user, fetchUser])

  const isAdmin = !!auth.user && ADMIN_ROLES.includes(auth.user.role)
  const isOperator = !!auth.user && OPERATOR_ROLES.includes(auth.user.role)

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAdmin, isOperator }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
