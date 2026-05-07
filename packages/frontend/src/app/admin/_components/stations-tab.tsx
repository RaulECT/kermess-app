'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/firebase/client'
import { upsertStation } from '@/lib/firebase/callables'
import { useAdminSession } from '@/context/admin-session'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import type { Station } from '@kermess/shared'

const menuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Requerido'),
  price: z.coerce.number().positive('Debe ser positivo'),
  active: z.boolean(),
})

const stationFormSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  type: z.enum(['simple', 'menu']),
  simplePrice: z.coerce.number().positive().nullable(),
  menu: z.array(menuItemSchema).nullable(),
  operatorPin: z.string().min(4).max(6).optional(),
  active: z.boolean(),
  order: z.coerce.number().int().min(0),
}).refine((s) => {
  if (s.type === 'simple') return s.simplePrice !== null
  if (s.type === 'menu') return s.menu !== null && s.menu.length > 0
  return true
}, { message: 'Completa los campos según el tipo de estación' })

type StationForm = z.infer<typeof stationFormSchema>

export function StationsTab() {
  const { session } = useAdminSession()
  const [stations, setStations] = useState<(Station & { id: string })[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStation, setEditingStation] = useState<(Station & { id: string }) | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedPin, setSavedPin] = useState<{ name: string; pin: string } | null>(null)

  const form = useForm<StationForm>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      name: '',
      type: 'simple',
      simplePrice: null,
      menu: null,
      operatorPin: '',
      active: true,
      order: 0,
    },
  })
  const { fields: menuFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'menu' as never,
  })

  const stationType = form.watch('type')

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      const q = query(collection(db, 'stations'), orderBy('order'))
      unsub = onSnapshot(q, (snap) => {
        setStations(snap.docs.map((d) => { const { id: _id, ...rest } = d.data() as Station & { id?: string }; void _id; return { id: d.id, ...rest } }))
      }, () => { if (active) setup() })
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

  function openCreate() {
    setEditingStation(null)
    setSavedPin(null)
    form.reset({
      name: '',
      type: 'simple',
      simplePrice: null,
      menu: null,
      operatorPin: '',
      active: true,
      order: stations.length,
    })
    setDialogOpen(true)
  }

  function openEdit(station: Station & { id: string }) {
    setSavedPin(null)
    setEditingStation(station)
    form.reset({
      name: station.name,
      type: station.type,
      simplePrice: station.simplePrice,
      menu: station.menu,
      operatorPin: '',
      active: station.active,
      order: station.order,
    })
    setDialogOpen(true)
  }

  async function onSubmit(values: StationForm) {
    if (!session) return
    setSaving(true)
    try {
      await upsertStation({
        adminPin: session.pin,
        station: {
          id: editingStation?.id,
          name: values.name,
          type: values.type,
          simplePrice: values.type === 'simple' ? values.simplePrice : null,
          menu: values.type === 'menu' ? values.menu : null,
          operatorPin: values.operatorPin || undefined,
          active: values.active,
          order: values.order,
        },
      })
      if (values.operatorPin) {
        setSavedPin({ name: values.name, pin: values.operatorPin })
      } else {
        toast.success(editingStation ? 'Estación actualizada' : 'Estación creada')
        setDialogOpen(false)
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(station: Station & { id: string }) {
    if (!session) return
    try {
      await upsertStation({
        adminPin: session.pin,
        station: {
          id: station.id,
          name: station.name,
          type: station.type,
          simplePrice: station.simplePrice,
          menu: station.menu,
          active: !station.active,
          order: station.order,
        },
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al cambiar estado')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Estaciones ({stations.length})</h2>
        <Button onClick={openCreate}>+ Nueva estación</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Precio / Items</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-center">Activa</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No hay estaciones. Crea una para comenzar.
                  </TableCell>
                </TableRow>
              )}
              {stations.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.type === 'simple' ? 'Simple' : 'Menú'}</Badge>
                  </TableCell>
                  <TableCell>
                    {s.type === 'simple'
                      ? `${s.simplePrice} cupones`
                      : `${s.menu?.filter((i) => i.active).length ?? 0} items`}
                  </TableCell>
                  <TableCell className="text-right">{s.totalSales}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingStation ? 'Editar estación' : 'Nueva estación'}</DialogTitle>
          </DialogHeader>

          {savedPin && (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="text-4xl">✓</div>
              <div>
                <p className="font-semibold text-green-600">{savedPin.name} guardada</p>
                <p className="mt-1 text-sm text-muted-foreground">Anota el PIN antes de cerrar</p>
              </div>
              <div className="w-full rounded-xl bg-muted px-6 py-4">
                <p className="text-xs text-muted-foreground mb-1">PIN de la estación</p>
                <p className="text-4xl font-mono font-bold tracking-widest">{savedPin.pin}</p>
              </div>
              <Button className="w-full" onClick={() => setDialogOpen(false)}>Listo</Button>
            </div>
          )}

          {!savedPin && <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Nombre</Label>
                <Input {...form.register('name')} placeholder="Ej: Tacos, Ruleta..." />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tipo</Label>
                <Select
                  value={stationType}
                  onValueChange={(v) => {
                    form.setValue('type', v as 'simple' | 'menu')
                    if (v === 'simple') { form.setValue('menu', null) }
                    else { form.setValue('simplePrice', null); form.setValue('menu', []) }
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple (precio fijo)</SelectItem>
                    <SelectItem value="menu">Menú (varios items)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Orden</Label>
                <Input {...form.register('order')} type="number" min="0" />
              </div>
            </div>

            {stationType === 'simple' && (
              <div className="flex flex-col gap-1.5">
                <Label>Precio (cupones)</Label>
                <Input {...form.register('simplePrice')} type="number" min="1" placeholder="5" />
              </div>
            )}

            {stationType === 'menu' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Items del menú</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendItem({ id: uuidv4(), name: '', price: 1, active: true })}
                  >
                    + Item
                  </Button>
                </div>
                {menuFields.map((field, i) => (
                  <div key={field.id} className="flex items-end gap-2 rounded border p-2">
                    <div className="flex-1">
                      <Input
                        {...form.register(`menu.${i}.name`)}
                        placeholder="Nombre del item"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        {...form.register(`menu.${i}.price`)}
                        type="number"
                        min="1"
                        placeholder="Precio"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(i)}
                      className="text-destructive"
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            <div className="flex flex-col gap-1.5">
              <Label>
                PIN del operador
                {editingStation && <span className="ml-1 text-xs text-muted-foreground">(dejar vacío para no cambiar)</span>}
              </Label>
              <Input
                {...form.register('operatorPin')}
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={editingStation ? '••••' : '4-6 dígitos'}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch('active')}
                onCheckedChange={(v) => form.setValue('active', v)}
              />
              <Label>Estación activa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  )
}
