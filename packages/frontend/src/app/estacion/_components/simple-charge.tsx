'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { charge } from '@/lib/firebase/callables'
import { useStationSession } from '@/context/station-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { User } from '@kermess/shared'

type ChargeState = 'confirm' | 'loading' | 'success' | 'error'

interface SimpleChargeProps {
  user: User
  onDone: () => void
}

export function SimpleCharge({ user, onDone }: SimpleChargeProps) {
  const { session } = useStationSession()
  const [state, setState] = useState<ChargeState>('confirm')
  const [errorMsg, setErrorMsg] = useState('')

  if (!session) return null

  const cost = session.simplePrice ?? 0
  const canAfford = user.balance >= cost

  async function handleCharge() {
    if (!session) return
    setState('loading')
    try {
      await charge({
        operatorPin: session.operatorPin,
        stationId: session.stationId,
        userId: user.id,
        clientTxId: uuidv4(),
      })
      setState('success')
      toast.success(`¡Cobrado! ${cost} cupones debitados`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al cobrar'
      setErrorMsg(msg)
      setState('error')
      toast.error(msg)
    }
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-6xl">✅</div>
        <p className="text-xl font-bold text-green-600">¡Cobro exitoso!</p>
        <p className="text-muted-foreground">
          <span className="font-semibold">{user.name}</span> — {cost} cupones
        </p>
        <p className="text-sm text-muted-foreground">
          Saldo restante: {user.balance - cost} cupones
        </p>
        <Button className="mt-2 w-full" onClick={onDone}>
          Escanear siguiente
        </Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-6xl">❌</div>
        <p className="text-xl font-bold text-red-600">Error</p>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" className="mt-2 w-full" onClick={onDone}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{user.name}</p>
              <p className="text-sm text-muted-foreground">
                Saldo: <span className={canAfford ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                  {user.balance} cupones
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-violet-600">{cost}</p>
              <p className="text-xs text-muted-foreground">a cobrar</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!canAfford && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
          Saldo insuficiente ({user.balance} / {cost} cupones)
        </p>
      )}

      <Button
        className="h-14 text-lg font-bold"
        disabled={!canAfford || state === 'loading'}
        onClick={handleCharge}
      >
        {state === 'loading' ? 'Cobrando…' : `Cobrar ${cost} cupones`}
      </Button>

      <Button variant="ghost" onClick={onDone}>
        Cancelar
      </Button>
    </div>
  )
}
