import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem('cwip_token'),
    isAuthenticated: !!localStorage.getItem('cwip_token'),
  })

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const token = res.data.access_token
    localStorage.setItem('cwip_token', token)
    setAuth({ token, isAuthenticated: true })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('cwip_token')
    setAuth({ token: null, isAuthenticated: false })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('cwip_token')
    if (token) {
      setAuth({ token, isAuthenticated: true })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
