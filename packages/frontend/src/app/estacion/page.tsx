'use client'

import { StationSessionProvider, useStationSession } from '@/context/station-session'
import { StationLogin } from './_components/station-login'
import { StationDashboard } from './_components/station-dashboard'

function EstacionInner() {
  const { session } = useStationSession()
  return session ? <StationDashboard /> : <StationLogin />
}

export default function EstacionPage() {
  return (
    <StationSessionProvider>
      <EstacionInner />
    </StationSessionProvider>
  )
}
