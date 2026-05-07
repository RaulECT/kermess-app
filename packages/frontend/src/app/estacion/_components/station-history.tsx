'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useStationSession } from '@/context/station-session'
import { formatTimestamp } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PurchaseTransaction } from '@kermess/shared'

export function StationHistory({ onBack }: { onBack: () => void }) {
  const { session } = useStationSession()
  const [txs, setTxs] = useState<(PurchaseTransaction & { id: string })[]>([])

  useEffect(() => {
    if (!session) return
    let unsub: (() => void) | undefined
    let active = true

    const q = query(
      collection(db, 'transactions'),
      where('stationId', '==', session.stationId),
      where('type', '==', 'purchase'),
      orderBy('timestamp', 'desc')
    )

    function setup() {
      unsub?.()
      unsub = onSnapshot(
        q,
        (snap) => {
          setTxs(
            snap.docs.map((d) => {
              const { id: _id, ...rest } = d.data() as PurchaseTransaction & { id?: string }
              void _id
              return { id: d.id, ...rest }
            })
          )
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

  const totalCoupons = txs.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ventas del turno</h2>
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
      </div>

      <div className="rounded-xl bg-violet-50 px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">Total cobrado</p>
        <p className="text-3xl font-extrabold text-violet-600">{totalCoupons}</p>
        <p className="text-sm text-muted-foreground">cupones en {txs.length} ventas</p>
      </div>

      {txs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas aún</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {txs.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
              <div>
                <p className="font-medium text-sm">{tx.userName}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.timestamp ? formatTimestamp(tx.timestamp as Timestamp) : ''}
                </p>
                {tx.items && tx.items.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tx.items.map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {item.qty}× {item.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-base font-bold text-red-500">{tx.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
