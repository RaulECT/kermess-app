'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createOperator, createAdmin } from '@/lib/firebase/callables'
import { useAdminSession } from '@/context/admin-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const staffFormSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  pin: z.string().min(4).max(6, 'PIN de 4-6 dígitos'),
  pin2: z.string().min(4).max(6),
}).refine((d) => d.pin === d.pin2, { message: 'Los PINs no coinciden', path: ['pin2'] })

type StaffForm = z.infer<typeof staffFormSchema>

type StaffType = 'cashier' | 'admin'

interface StaffEntry {
  id: string
  name: string
  role: StaffType
}

export function PersonalTab() {
  const { session } = useAdminSession()
  const [staff, setStaff] = useState<StaffEntry[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [staffType, setStaffType] = useState<StaffType>('cashier')
  const [saving, setSaving] = useState(false)
  const [createdPin, setCreatedPin] = useState<{ name: string; pin: string } | null>(null)

  const form = useForm<StaffForm>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: { name: '', pin: '', pin2: '' },
  })

  function openCreate(type: StaffType) {
    setStaffType(type)
    form.reset()
    setCreatedPin(null)
    setDialogOpen(true)
  }

  async function onSubmit(values: StaffForm) {
    if (!session) return
    setSaving(true)
    try {
      if (staffType === 'cashier') {
        const result = await createOperator({ adminPin: session.pin, name: values.name, pin: values.pin })
        setStaff((prev) => [...prev, { id: result.operatorId, name: values.name, role: 'cashier' }])
      } else {
        const result = await createAdmin({ adminPin: session.pin, name: values.name, pin: values.pin })
        setStaff((prev) => [...prev, { id: result.adminId, name: values.name, role: 'admin' }])
      }
      setCreatedPin({ name: values.name, pin: values.pin })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const cashiers = staff.filter((s) => s.role === 'cashier')
  const admins = staff.filter((s) => s.role === 'admin')

  return (
    <div className="flex flex-col gap-6">
      {/* Cajeros */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Cajeros ({cashiers.length})</CardTitle>
          <Button size="sm" onClick={() => openCreate('cashier')}>
            + Nuevo cajero
          </Button>
        </CardHeader>
        <CardContent>
          {cashiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cajeros registrados. Crea uno para que puedan registrar asistentes y recargar cupones.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cashiers.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span>{c.name}</span>
                  <span className="text-xs text-muted-foreground">Cajero</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Administradores ({admins.length + 1})</CardTitle>
          <Button size="sm" onClick={() => openCreate('admin')}>
            + Nuevo admin
          </Button>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {/* Admin actual */}
            <li className="flex items-center justify-between rounded border px-3 py-2 text-sm bg-muted/40">
              <span className="font-medium">{session?.name} (tú)</span>
              <span className="text-xs text-muted-foreground">Admin</span>
            </li>
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{a.name}</span>
                <span className="text-xs text-muted-foreground">Admin</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {staffType === 'cashier' ? 'Nuevo cajero' : 'Nuevo administrador'}
            </DialogTitle>
          </DialogHeader>

          {createdPin ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="text-4xl">✓</div>
              <div>
                <p className="font-semibold text-green-600">{createdPin.name} creado</p>
                <p className="mt-1 text-sm text-muted-foreground">Anota el PIN antes de cerrar</p>
              </div>
              <div className="w-full rounded-xl bg-muted px-6 py-4">
                <p className="text-xs text-muted-foreground mb-1">PIN</p>
                <p className="text-4xl font-mono font-bold tracking-widest">{createdPin.pin}</p>
              </div>
              <Button className="w-full" onClick={() => setDialogOpen(false)}>Listo</Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Nombre</Label>
                <Input {...form.register('name')} placeholder="Nombre completo" />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>PIN (4-6 dígitos)</Label>
                <Input
                  {...form.register('pin')}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                />
                {form.formState.errors.pin && (
                  <p className="text-xs text-destructive">{form.formState.errors.pin.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Confirmar PIN</Label>
                <Input
                  {...form.register('pin2')}
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                />
                {form.formState.errors.pin2 && (
                  <p className="text-xs text-destructive">{form.formState.errors.pin2.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creando...' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
