'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, onSnapshot } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '@/lib/firebase/client'
import { updateConfig, resetSystem } from '@/lib/firebase/callables'
import { useAdminSession } from '@/context/admin-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import type { EventConfig } from '@kermess/shared'

const formSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  couponRate: z.coerce.number().positive('Debe ser positivo'),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Requerido'),
      target: z.coerce.number().positive('Debe ser positivo'),
    })
  ).length(3),
})

type FormValues = z.infer<typeof formSchema>

const STATUS_LABELS = {
  setup: 'Configuración',
  live: 'En vivo',
  closed: 'Cerrado',
}
const STATUS_COLORS = {
  setup: 'secondary',
  live: 'default',
  closed: 'destructive',
} as const

export function ConfigTab() {
  const { session } = useAdminSession()
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<EventConfig | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      couponRate: 1,
      goals: [
        { id: '', name: 'Meta 1', target: 10000 },
        { id: '', name: 'Meta 2', target: 10000 },
        { id: '', name: 'Meta 3', target: 10000 },
      ],
    },
  })
  const { fields } = useFieldArray({ control: form.control, name: 'goals' })

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      unsub = onSnapshot(
        doc(db, 'config', 'event'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as EventConfig
            setConfig(data)
            form.reset({
              name: data.name,
              couponRate: data.couponRate,
              goals: data.goals.map((g) => ({ id: g.id, name: g.name, target: g.target })),
            })
          }
        },
        () => { if (active) setup() }
      )
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
  }, [form])

  async function handleStatusChange(status: 'live' | 'closed') {
    if (!session) return
    setSaving(true)
    try {
      await updateConfig({ adminPin: session.pin, patch: { status } })
      toast.success(status === 'live' ? '¡Evento iniciado!' : 'Evento cerrado')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar estado')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!session || resetConfirm !== 'RESET') return
    setResetting(true)
    try {
      await resetSystem({ adminPin: session.pin })
      toast.success('Sistema reiniciado correctamente')
      setResetOpen(false)
      setResetConfirm('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al reiniciar')
    } finally {
      setResetting(false)
    }
  }

  async function onSubmit(values: FormValues) {
    if (!session) return
    setSaving(true)
    try {
      await updateConfig({
        adminPin: session.pin,
        patch: {
          name: values.name,
          couponRate: values.couponRate,
          goals: values.goals,
        },
      })
      toast.success('Configuración guardada')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Estado del evento */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del evento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Badge variant={STATUS_COLORS[config.status]}>
              {STATUS_LABELS[config.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Total recaudado: <strong>${config.totalRaised.toLocaleString('es-MX')}</strong>
            </span>
            <div className="ml-auto flex gap-2">
              {config.status === 'setup' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('live')}
                  disabled={saving}
                >
                  ▶ Iniciar evento
                </Button>
              )}
              {config.status === 'live' && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleStatusChange('closed')}
                  disabled={saving}
                >
                  ■ Cerrar evento
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración general</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            {/* Nombre y tasa */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Nombre del evento</Label>
                <Input {...form.register('name')} placeholder="Kupón" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cupones por peso (tasa)</Label>
                <Input
                  {...form.register('couponRate')}
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="1"
                />
                {form.formState.errors.couponRate && (
                  <p className="text-xs text-destructive">{form.formState.errors.couponRate.message}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Metas */}
            <div>
              <h3 className="mb-4 font-semibold">Metas de recaudación</h3>
              <div className="flex flex-col gap-4">
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
                    <input type="hidden" {...form.register(`goals.${i}.id`)} />
                    <div className="flex flex-col gap-1.5">
                      <Label>Meta {i + 1} — Nombre</Label>
                      <Input
                        {...form.register(`goals.${i}.name`)}
                        placeholder={`Meta ${i + 1}`}
                      />
                      {form.formState.errors.goals?.[i]?.name && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.goals[i]?.name?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Objetivo ($)</Label>
                      <Input
                        {...form.register(`goals.${i}.target`)}
                        type="number"
                        min="1"
                        placeholder="10000"
                      />
                      {config && (
                        <p className="text-xs text-muted-foreground">
                          Recaudado: ${config.goals[i]?.raised.toLocaleString('es-MX') ?? 0}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving} className="self-end">
              {saving ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Zona de peligro */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zona de peligro</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Reiniciar sistema</p>
            <p className="text-xs text-muted-foreground">
              Elimina estaciones, operadores, asistentes, transacciones y auditoría. Los administradores se conservan.
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => { setResetConfirm(''); setResetOpen(true) }}>
            Reiniciar
          </Button>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={(o) => { if (!o) { setResetOpen(false); setResetConfirm('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reiniciar el sistema?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminarán todas las estaciones, operadores de caja,
              asistentes registrados, transacciones y registros de auditoría. El evento volverá al
              estado <strong>Configuración</strong>. Los administradores no se verán afectados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2">
            <Label>
              Escribe <strong>RESET</strong> para confirmar
            </Label>
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="RESET"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetOpen(false); setResetConfirm('') }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={resetConfirm !== 'RESET' || resetting}
              onClick={handleReset}
            >
              {resetting ? 'Reiniciando...' : 'Confirmar reinicio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
