'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PinPad } from '@/components/shared/pin-pad'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cashierLogin } from '@/lib/firebase/callables'
import { useCashierSession } from '@/context/cashier-session'

export function CashierLogin() {
  const { login } = useCashierSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handlePin(pin: string) {
    setLoading(true)
    setError(undefined)
    try {
      const result = await cashierLogin({ pin })
      login({ cashierId: result.cashierId, name: result.name, pin, startedAt: Date.now() })
      toast.success(`Bienvenido, ${result.name}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'PIN incorrecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Módulo Caja</CardTitle>
          <CardDescription>Kupón</CardDescription>
        </CardHeader>
        <CardContent>
          <PinPad onSubmit={handlePin} loading={loading} error={error} label="PIN de cajero" />
        </CardContent>
      </Card>
    </div>
  )
}
