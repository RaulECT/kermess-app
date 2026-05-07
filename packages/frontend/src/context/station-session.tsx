'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import type { MenuItem } from '@kermess/shared'

export interface StationSession {
  stationId: string
  name: string
  type: 'simple' | 'menu'
  simplePrice: number | null
  menu: MenuItem[] | null
  operatorPin: string
  startedAt: number
}

interface StationSessionContextType {
  session: StationSession | null
  login: (session: StationSession) => void
  logout: () => void
}

const StationSessionContext = createContext<StationSessionContextType | null>(null)
const SESSION_KEY = 'kermess_station_session'

export function StationSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StationSession | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY)
    if (stored) {
      try { setSession(JSON.parse(stored) as StationSession) } catch { sessionStorage.removeItem(SESSION_KEY) }
    }
  }, [])

  function login(s: StationSession) {
    setSession(s)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  }

  function logout() {
    setSession(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  return (
    <StationSessionContext.Provider value={{ session, login, logout }}>
      {children}
    </StationSessionContext.Provider>
  )
}

export function useStationSession() {
  const ctx = useContext(StationSessionContext)
  if (!ctx) throw new Error('useStationSession debe usarse dentro de StationSessionProvider')
  return ctx
}
