'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '@/lib/firebase/client'
import { reverseTransaction } from '@/lib/firebase/callables'
import { useAdminSession } from '@/context/admin-session'
import { formatTimestamp } from '@/lib/utils/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Transaction } from '@kermess/shared'

type TxWithId = Transaction & { id: string }
type FilterType = 'all' | 'topup' | 'purchase' | 'reversal'

const TYPE_LABELS: Record<string, string> = {
  topup: 'Recarga',
  purchase: 'Cobro',
  reversal: 'Reversión',
}
const TYPE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  topup: 'default',
  purchase: 'secondary',
  reversal: 'destructive',
}

export function TransactionsTab() {
  const { session } = useAdminSession()
  const [txs, setTxs] = useState<TxWithId[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [reversing, setReversing] = useState<TxWithId | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'))
      unsub = onSnapshot(q, (snap) => {
        setTxs(snap.docs.map((d) => {
          const { id: _id, ...rest } = d.data() as Transaction & { id?: string }
          void _id
          return { id: d.id, ...rest }
        }))
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

  const filtered = txs.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      const name = t.userName?.toLowerCase() ?? ''
      const station = t.type === 'purchase' ? (t.stationName?.toLowerCase() ?? '') : ''
      if (!name.includes(s) && !station.includes(s) && !t.id.includes(s)) return false
    }
    return true
  })

  async function handleReverse() {
    if (!session || !reversing || reason.trim().length < 5) return
    setLoading(true)
    try {
      await reverseTransaction({ adminPin: session.pin, txId: reversing.id, reason: reason.trim() })
      toast.success('Transacción revertida')
      setReversing(null)
      setReason('')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al revertir')
    } finally {
      setLoading(false)
    }
  }

  // CSV export
  function exportCSV() {
    const headers = ['ID', 'Tipo', 'Usuario', 'Monto', 'Estación/Meta', 'Método', 'Fecha', 'Revertida']
    const rows = txs.map((t) => {
      const ts = t.timestamp ? formatTimestamp(t.timestamp as Timestamp) : ''
      const extra = t.type === 'purchase' ? t.stationName ?? '' : t.type === 'topup' ? t.goalId ?? '' : ''
      const method = t.type === 'topup' ? t.paymentMethod ?? '' : ''
      return [t.id, TYPE_LABELS[t.type] ?? t.type, t.userName, t.amount, extra, method, ts, t.reversedByTx ? 'Sí' : 'No']
    })
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transacciones-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nombre o estación…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-1">
          {(['all', 'topup', 'purchase', 'reversal'] as FilterType[]).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todas' : TYPE_LABELS[f]}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} className="ml-auto">
          ⬇ Exportar CSV
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} transacciones</p>

      {/* List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin transacciones</p>
        )}
        {filtered.map((tx) => (
          <div
            key={tx.id}
            className={`flex items-center justify-between rounded-xl border bg-card px-4 py-3 ${tx.reversedByTx ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_VARIANT[tx.type] ?? 'outline'} className="text-xs">
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </Badge>
                  {tx.reversedByTx && <Badge variant="outline" className="text-xs">Revertida</Badge>}
                </div>
                <span className="text-sm font-medium">{tx.userName}</span>
                {'stationName' in tx && <span className="text-xs text-muted-foreground">{tx.stationName}</span>}
                {'goalId' in tx && <span className="text-xs text-muted-foreground">Meta: {tx.goalId}</span>}
                <span className="text-xs text-muted-foreground">
                  {tx.timestamp ? formatTimestamp(tx.timestamp as Timestamp) : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`tabular-nums font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount}
              </span>
              {!tx.reversedByTx && tx.type !== 'reversal' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { setReversing(tx); setReason('') }}
                >
                  Revertir
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reversal dialog */}
      <Dialog open={!!reversing} onOpenChange={(o) => { if (!o) setReversing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revertir transacción</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Esto restaurará el saldo del usuario y marcará la transacción como revertida.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label>Motivo de la reversión *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explica el motivo (mínimo 5 caracteres)"
                rows={3}
              />
              {reason.length > 0 && reason.length < 5 && (
                <p className="text-xs text-destructive">Mínimo 5 caracteres</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversing(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 5 || loading}
              onClick={handleReverse}
            >
              {loading ? 'Revirtiendo…' : 'Confirmar reversión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
