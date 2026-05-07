'use client'

import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { GoalsDisplay } from './_components/goals-display'
import { FullscreenButton } from './_components/fullscreen-button'
import type { EventConfig } from '@kermess/shared'

export default function DashboardPage() {
  const [config, setConfig] = useState<EventConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState('iniciando...')

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      unsub = onSnapshot(
        doc(db, 'config', 'event'),
        (snap) => {
          setDebug('snapshot recibido')
          if (snap.exists()) {
            setConfig(snap.data() as EventConfig)
            setError(null)
          } else {
            setError('El evento aún no ha sido configurado.')
          }
        },
        () => { if (active) setup() }
      )
      setDebug('onSnapshot registrado, esperando datos...')
    }

    function reconnect() { if (active) setup() }

    setup()
    document.addEventListener('visibilitychange', reconnect)
    window.addEventListener('online', reconnect)

    return () => {
      active = false
      unsub?.()
      document.removeEventListener('visibilitychange', reconnect)
      window.removeEventListener('online', reconnect)
    }
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-center text-red-400">
          <p className="text-xl font-semibold">No se pudo cargar el dashboard</p>
          <p className="max-w-sm text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <p>Cargando dashboard…</p>
          <p className="text-xs text-gray-600">{debug}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <GoalsDisplay
        goals={config.goals}
        totalRaised={config.totalRaised}
        eventName={config.name}
      />
      <FullscreenButton />
    </>
  )
}
