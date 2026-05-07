'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { charge } from '@/lib/firebase/callables'
import { useStationSession } from '@/context/station-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { User, MenuItem } from '@kermess/shared'

interface CartItem extends MenuItem {
  qty: number
}

type ChargeState = 'menu' | 'loading' | 'success' | 'error'

interface MenuChargeProps {
  user: User
  onDone: () => void
}

export function MenuCharge({ user, onDone }: MenuChargeProps) {
  const { session } = useStationSession()
  const [cart, setCart] = useState<CartItem[]>([])
  const [state, setState] = useState<ChargeState>('menu')
  const [errorMsg, setErrorMsg] = useState('')

  if (!session || !session.menu) return null

  const activeMenu = session.menu.filter((i) => i.active)
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const canAfford = user.balance >= total && total > 0

  function addItem(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) return prev.map((c) => c.id === item.id ? { ...c, qty: c.qty + 1 } : c)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function removeItem(itemId: string) {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === itemId)
      if (!existing) return prev
      if (existing.qty <= 1) return prev.filter((c) => c.id !== itemId)
      return prev.map((c) => c.id === itemId ? { ...c, qty: c.qty - 1 } : c)
    })
  }

  function getQty(itemId: string) {
    return cart.find((c) => c.id === itemId)?.qty ?? 0
  }

  async function handleCharge() {
    if (!session || cart.length === 0) return
    setState('loading')
    try {
      await charge({
        operatorPin: session.operatorPin,
        stationId: session.stationId,
        userId: user.id,
        clientTxId: uuidv4(),
        items: cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty })),
      })
      setState('success')
      toast.success(`¡Cobrado! ${total} cupones debitados`)
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
        <p className="text-muted-foreground font-semibold">{user.name}</p>
        <ul className="text-sm text-muted-foreground">
          {cart.map((i) => (
            <li key={i.id}>{i.qty}× {i.name} = {i.price * i.qty} cupones</li>
          ))}
        </ul>
        <p className="text-lg font-bold">Total: {total} cupones</p>
        <Button className="mt-2 w-full" onClick={onDone}>Escanear siguiente</Button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-6xl">❌</div>
        <p className="text-xl font-bold text-red-600">Error</p>
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
        <Button variant="outline" className="mt-2 w-full" onClick={() => { setState('menu'); setCart([]) }}>
          Intentar de nuevo
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* User info */}
      <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
        <div>
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm text-muted-foreground">Saldo: <span className="font-medium">{user.balance}</span> cupones</p>
        </div>
        {total > 0 && (
          <div className="text-right">
            <p className="text-2xl font-extrabold text-violet-600">{total}</p>
            <p className="text-xs text-muted-foreground">total</p>
          </div>
        )}
      </div>

      {/* Menu items */}
      <div className="flex flex-col gap-2">
        {activeMenu.map((item) => {
          const qty = getQty(item.id)
          return (
            <Card key={item.id} className={qty > 0 ? 'ring-2 ring-violet-500' : ''}>
              <CardContent className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.price} cupones</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={qty === 0}
                    onClick={() => removeItem(item.id)}
                  >−</Button>
                  <span className="w-6 text-center font-bold">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => addItem(item)}
                  >+</Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cart summary */}
      {cart.length > 0 && (
        <>
          <Separator />
          <div className="rounded-lg bg-muted/30 px-4 py-3">
            <p className="mb-1 text-sm font-semibold">Resumen:</p>
            {cart.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span>{i.qty}× {i.name}</span>
                <span>{i.price * i.qty}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>{total} cupones</span>
            </div>
          </div>
        </>
      )}

      {!canAfford && total > 0 && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-600">
          Saldo insuficiente ({user.balance} / {total} cupones)
        </p>
      )}

      <Button
        className="h-14 text-lg font-bold"
        disabled={!canAfford || state === 'loading'}
        onClick={handleCharge}
      >
        {state === 'loading' ? 'Cobrando…' : `Cobrar ${total} cupones`}
      </Button>
      <Button variant="ghost" onClick={onDone}>Cancelar</Button>
    </div>
  )
}
