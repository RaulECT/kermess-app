'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PinPad } from '@/components/shared/pin-pad'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminLogin, createInitialAdmin } from '@/lib/firebase/callables'
import { useAdminSession } from '@/context/admin-session'

export function AdminLogin() {
  const { login } = useAdminSession()
  const [loading, setLoading] = useState(false)
  const [pinError, setPinError] = useState<string>()
  const [showSetup, setShowSetup] = useState(false)
  const [setupName, setSetupName] = useState('')
  const [setupPin, setSetupPin] = useState('')
  const [setupPin2, setSetupPin2] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)

  async function handlePinSubmit(pin: string) {
    setLoading(true)
    setPinError(undefined)
    try {
      const result = await adminLogin({ pin })
      login({ adminId: result.adminId, name: result.name, pin })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'PIN incorrecto'
      setPinError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (setupPin !== setupPin2) {
      toast.error('Los PINs no coinciden')
      return
    }
    if (setupPin.length < 4) {
      toast.error('El PIN debe tener al menos 4 dígitos')
      return
    }
    setSetupLoading(true)
    try {
      const result = await createInitialAdmin({ name: setupName, pin: setupPin })
      login({ adminId: result.adminId, name: result.name, pin: setupPin })
      toast.success(`Bienvenido, ${result.name}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear admin'
      toast.error(msg)
    } finally {
      setSetupLoading(false)
    }
  }

  if (showSetup) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Primera configuración</CardTitle>
          <CardDescription>Crea el administrador inicial del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nombre del administrador</Label>
              <Input
                id="name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Tu nombre"
                required
                minLength={2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin">PIN (4-6 dígitos)</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={setupPin}
                onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pin2">Confirmar PIN</Label>
              <Input
                id="pin2"
                type="password"
                inputMode="numeric"
                value={setupPin2}
                onChange={(e) => setSetupPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowSetup(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={setupLoading} className="flex-1">
                {setupLoading ? 'Creando...' : 'Crear admin'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Panel Admin</CardTitle>
        <CardDescription>Kermes App</CardDescription>
      </CardHeader>
      <CardContent>
        <PinPad
          onSubmit={handlePinSubmit}
          loading={loading}
          error={pinError}
          label="Ingresa tu PIN de administrador"
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowSetup(true)}
            className="text-xs text-muted-foreground hover:underline"
            type="button"
          >
            Primera vez — Configurar admin inicial
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
