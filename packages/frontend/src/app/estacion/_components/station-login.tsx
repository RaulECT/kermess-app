'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { toast } from 'sonner'
import { db, ensureAuth } from '@/lib/firebase/client'
import { stationLogin } from '@/lib/firebase/callables'
import { PinPad } from '@/components/shared/pin-pad'
import { useStationSession } from '@/context/station-session'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Station } from '@kermess/shared'

type Step = 'select' | 'pin'

export function StationLogin() {
  const { login } = useStationSession()
  const [step, setStep] = useState<Step>('select')
  const [stations, setStations] = useState<(Station & { id: string })[]>([])
  const [selected, setSelected] = useState<(Station & { id: string }) | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    async function loadStations() {
      await ensureAuth()
      const q = query(
        collection(db, 'stations'),
        where('active', '==', true),
        orderBy('order')
      )
      const snap = await getDocs(q)
      setStations(
        snap.docs.map((d) => {
          const { id: _id, ...rest } = d.data() as Station & { id?: string }
          void _id
          return { id: d.id, ...rest }
        })
      )
    }
    loadStations()
  }, [])

  function selectStation(station: Station & { id: string }) {
    setSelected(station)
    setStep('pin')
    setError(undefined)
  }

  async function handlePin(pin: string) {
    if (!selected) return
    setLoading(true)
    setError(undefined)
    try {
      const result = await stationLogin({ stationId: selected.id, operatorPin: pin })
      login({
        stationId: result.stationId,
        name: result.name,
        type: result.type as 'simple' | 'menu',
        simplePrice: result.simplePrice,
        menu: result.menu,
        operatorPin: pin,
        startedAt: Date.now(),
      })
      toast.success(`Estación ${result.name} activa`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        {step === 'select' ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Módulo Estación</CardTitle>
              <CardDescription>Selecciona tu estación</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {stations.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No hay estaciones activas
                </p>
              )}
              {stations.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="h-auto justify-between px-4 py-3"
                  onClick={() => selectStation(s)}
                >
                  <span className="font-medium">{s.name}</span>
                  <Badge variant="secondary">
                    {s.type === 'simple' ? `${s.simplePrice} cupones` : 'Menú'}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{selected?.name}</CardTitle>
              <CardDescription>Ingresa el PIN de la estación</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <PinPad onSubmit={handlePin} loading={loading} error={error} label="PIN de estación" />
              <Button variant="ghost" size="sm" onClick={() => { setStep('select'); setError(undefined) }}>
                ← Cambiar estación
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
