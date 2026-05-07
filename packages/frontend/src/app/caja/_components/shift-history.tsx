'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useCashierSession } from '@/context/cashier-session'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatTimestamp } from '@/lib/utils/formatters'
import type { TopupTransaction } from '@kermess/shared'

export function ShiftHistory({ onBack }: { onBack: () => void }) {
  const { session } = useCashierSession()
  const [txs, setTxs] = useState<(TopupTransaction & { id: string })[]>([])

  useEffect(() => {
    if (!session) return
    let unsub: (() => void) | undefined
    let active = true

    const q = query(
      collection(db, 'transactions'),
      where('cashierId', '==', session.cashierId),
      where('type', '==', 'topup'),
      orderBy('timestamp', 'desc')
    )

    function setup() {
      unsub?.()
      unsub = onSnapshot(
        q,
        (snap) => {
          setTxs(snap.docs.map((d) => { const { id: _id, ...rest } = d.data() as TopupTransaction & { id?: string }; void _id; return { id: d.id, ...rest } }))
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
  }, [session])

  const totalPesos = txs.reduce((sum, t) => sum + (t.pesosReceived ?? 0), 0)
  const totalCoupons = txs.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
        <h2 className="text-lg font-semibold">Mis recargas del turno</h2>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{txs.length}</p>
            <p className="text-xs text-muted-foreground">Recargas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">${totalPesos.toLocaleString('es-MX')}</p>
            <p className="text-xs text-muted-foreground">Recaudado</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista */}
      {txs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aún no hay recargas en este turno.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {txs.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="font-medium text-sm">{tx.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.timestamp ? formatTimestamp(tx.timestamp as Timestamp) : '...'}
                  {' · '}
                  {tx.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{tx.amount} cupones</p>
                <p className="text-xs text-muted-foreground">${tx.pesosReceived?.toLocaleString('es-MX')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground">
        Total del turno: <strong>{totalCoupons} cupones</strong> recargados
      </div>
    </div>
  )
}
