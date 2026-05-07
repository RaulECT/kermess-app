'use client'

import { createContext, useContext, useState, useEffect } from 'react'

export interface CashierSession {
  cashierId: string
  name: string
  pin: string
  startedAt: number // timestamp ms para historial del turno
}

interface CashierSessionContextType {
  session: CashierSession | null
  login: (session: CashierSession) => void
  logout: () => void
}

const CashierSessionContext = createContext<CashierSessionContextType | null>(null)
const SESSION_KEY = 'kermess_cashier_session'

export function CashierSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CashierSession | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      try { setSession(JSON.parse(stored) as CashierSession) } catch { sessionStorage.removeItem(SESSION_KEY) }
    }
  }, [])

  function login(s: CashierSession) {
    setSession(s)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  }

  function logout() {
    setSession(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <CashierSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </CashierSessionContext.Provider>
  )
}

export function useCashierSession() {
  const ctx = useContext(CashierSessionContext)
  if (!ctx) throw new Error('useCashierSession debe usarse dentro de CashierSessionProvider')
  return ctx
}
