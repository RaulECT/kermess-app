'use client'

import { useCallback, useRef, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { Html5Qrcode } from 'html5-qrcode'
import { db } from '@/lib/firebase/client'
import { SimpleCharge } from './simple-charge'
import { MenuCharge } from './menu-charge'
import { useStationSession } from '@/context/station-session'
import { Button } from '@/components/ui/button'
import type { User } from '@kermess/shared'

type FlowState = 'idle' | 'loading-user' | 'charging' | 'error'

export function QrChargeFlow() {
  const { session } = useStationSession()
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [user, setUser] = useState<User | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Limpiar el input para que pueda usarse de nuevo
    e.target.value = ''

    setFlowState('loading-user')
    try {
      const scanner = new Html5Qrcode('qr-file-reader')
      const token = await scanner.scanFile(file, false)
      scanner.clear()

      const snap = await getDoc(doc(db, 'users', token))
      if (!snap.exists()) {
        setErrorMsg('QR no válido o usuario no registrado')
        setFlowState('error')
        return
      }
      setUser({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) })
      setFlowState('charging')
    } catch {
      setErrorMsg('No se pudo leer el código QR. Intenta de nuevo.')
      setFlowState('error')
    }
  }, [])

  function reset() {
    setFlowState('idle')
    setUser(null)
    setErrorMsg('')
  }

  if (!session) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Elemento oculto requerido por html5-qrcode para scanFile */}
      <div id="qr-file-reader" className="hidden" />

      {/* Input de cámara nativa */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />

      {flowState === 'idle' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Button
            size="lg"
            className="h-20 w-full max-w-xs text-xl"
            onClick={() => inputRef.current?.click()}
          >
            📷 Escanear QR
          </Button>
          <p className="text-sm text-muted-foreground">
            Se abrirá la cámara del dispositivo
          </p>
        </div>
      )}

      {flowState === 'loading-user' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verificando QR…</p>
        </div>
      )}

      {flowState === 'charging' && user && (
        <>
          {session.type === 'simple' ? (
            <SimpleCharge user={user} onDone={reset} />
          ) : (
            <MenuCharge user={user} onDone={reset} />
          )}
        </>
      )}

      {flowState === 'error' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="text-5xl">⚠️</div>
          <p className="font-semibold text-red-600">{errorMsg}</p>
          <Button variant="outline" onClick={reset}>Intentar de nuevo</Button>
        </div>
      )}
    </div>
  )
}
