'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { QRDisplay } from '@/components/shared/qr-display'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { registerUser, topup } from '@/lib/firebase/callables'
import { useCashierSession } from '@/context/cashier-session'
import type { EventConfig } from '@kermess/shared'

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  phone: z.string().min(10, 'Mínimo 10 dígitos').max(15),
  pesos: z.string().optional(),
  paymentMethod: z.enum(['cash', 'transfer']),
  goalId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

interface RegisterResult {
  userId: string
  name: string
  coupons: number
}

export function RegisterUser({ onBack }: { onBack: () => void }) {
  const { session } = useCashierSession()
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<RegisterResult | null>(null)
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null)

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'event'), (snap) => {
      if (snap.exists()) setEventConfig(snap.data() as EventConfig)
    })
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', pesos: '', paymentMethod: 'cash', goalId: '' },
  })

  const pesosValue = parseFloat(form.watch('pesos') || '0') || 0
  const coupons = eventConfig ? Math.floor(pesosValue * eventConfig.couponRate) : 0

  async function onSubmit(values: FormValues) {
    if (!session) return
    setSaving(true)
    const clientTxId = uuidv4()
    try {
      const res = await registerUser({
        cashierPin: session.pin,
        name: values.name,
        phone: values.phone,
      })

      let loadedCoupons = 0
      if (pesosValue > 0 && values.goalId) {
        const topupRes = await topup({
          cashierPin: session.pin,
          userId: res.userId,
          pesos: pesosValue,
          paymentMethod: values.paymentMethod,
          goalId: values.goalId,
          clientTxId,
        })
        loadedCoupons = topupRes.coupons
      }

      setResult({ userId: res.userId, name: values.name, coupons: loadedCoupons })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  // ── Pantalla de éxito ──
  if (result) {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const url = `${base}/asistente/${result.userId}`

    return (
      <div className="flex flex-col items-center gap-6 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-green-600">¡Asistente registrado!</h2>
          <p className="text-muted-foreground">{result.name}</p>
          {result.coupons > 0 && (
            <p className="mt-1 text-2xl font-extrabold text-violet-600">{result.coupons} cupones cargados</p>
          )}
        </div>

        <QRDisplay value={url} size={220} label="Escanear para abrir en celular" />

        <div className="w-full max-w-sm rounded-lg border bg-muted/40 p-3 text-center">
          <p className="mb-1 text-xs text-muted-foreground">Link del asistente</p>
          <p className="break-all text-sm font-mono">{url}</p>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => { navigator.clipboard.writeText(url); toast.success('Link copiado') }}
          >
            Copiar link
          </Button>
          <Button onClick={() => { setResult(null); form.reset() }}>
            Registrar otro
          </Button>
          <Button variant="ghost" onClick={onBack}>Volver al menú</Button>
        </div>
      </div>
    )
  }

  // ── Formulario ──
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
        <h2 className="text-lg font-semibold">Registrar asistente</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del asistente</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo</Label>
              <Input {...form.register('name')} placeholder="Nombre Apellido" autoFocus />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Teléfono</Label>
              <Input {...form.register('phone')} type="tel" inputMode="numeric" placeholder="5512345678" />
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Carga inicial de cupones <span className="text-muted-foreground font-normal text-sm">(opcional)</span></CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Monto ($)</Label>
              <Input
                {...form.register('pesos')}
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="0"
                className="h-12 text-center text-xl"
              />
              {coupons > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  = <strong>{coupons} cupones</strong>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['cash', 'transfer'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => form.setValue('paymentMethod', m)}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${form.watch('paymentMethod') === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/60'}`}
                  >
                    {m === 'cash' ? '💵 Efectivo' : '📲 Transferencia'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Asignar a meta</Label>
              <div className="flex flex-col gap-2">
                {eventConfig?.goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => form.setValue('goalId', g.id)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${form.watch('goalId') === g.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/60'}`}
                  >
                    <span>{g.name}</span>
                    <span className="text-xs text-muted-foreground">${g.raised.toLocaleString('es-MX')} / ${g.target.toLocaleString('es-MX')}</span>
                  </button>
                ))}
              </div>
              {pesosValue > 0 && !form.watch('goalId') && (
                <p className="text-xs text-destructive">Selecciona una meta para continuar</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={saving || (pesosValue > 0 && !form.watch('goalId'))}
          className="w-full h-12 text-base"
        >
          {saving ? 'Registrando...' : pesosValue > 0 ? `Registrar y cargar ${coupons} cupones` : 'Registrar y generar QR'}
        </Button>
      </form>
    </div>
  )
}
