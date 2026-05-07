'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export interface AdminSession {
  adminId: string
  name: string
  pin: string
}

interface AdminSessionContextType {
  session: AdminSession | null
  login: (session: AdminSession) => void
  logout: () => void
}

const AdminSessionContext = createContext<AdminSessionContextType | null>(null)

const SESSION_KEY = 'kermess_admin_session'

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      try {
        setSession(JSON.parse(stored) as AdminSession)
      } catch {
        sessionStorage.removeItem(SESSION_KEY)
      }
    }
  }, [])

  function login(s: AdminSession) {
    setSession(s)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  }

  function logout() {
    setSession(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <AdminSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </AdminSessionContext.Provider>
  )
}

export function useAdminSession() {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) throw new Error('useAdminSession debe usarse dentro de AdminSessionProvider')
  return ctx
}
