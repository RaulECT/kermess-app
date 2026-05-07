'use client'

import { formatTimestampRelative } from '@/lib/utils/formatters'
import type { Transaction } from '@kermess/shared'
import type { Timestamp } from 'firebase/firestore'

interface TransactionListProps {
  transactions: (Transaction & { id: string })[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-fg-muted">
        Aún no hay movimientos. ¡A gastar cupones!
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {transactions.map((tx) => {
        const isPositive = tx.amount > 0
        return (
          <li
            key={tx.id}
            className="flex items-center gap-3 rounded-xl bg-surface-secondary px-3 py-3"
          >
            {/* Icon circle */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                background: isPositive ? '#22C55E22' : '#F43F5E22',
                color: isPositive ? '#22C55E' : '#F43F5E',
              }}
            >
              {isPositive ? '+' : '−'}
            </div>

            {/* Details */}
            <div className="flex flex-1 flex-col">
              <span className="text-[13px] font-medium text-fg-primary">{txLabel(tx)}</span>
              <span className="text-[11px] text-fg-muted">
                {txSubLabel(tx)} · {tx.timestamp ? formatTimestampRelative(tx.timestamp as Timestamp) : ''}
              </span>
            </div>

            {/* Amount */}
            <span
              className="font-mono text-[15px] font-semibold"
              style={{ color: isPositive ? '#22C55E' : '#F43F5E' }}
            >
              {isPositive ? '+' : ''}{tx.amount}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function txLabel(tx: Transaction): string {
  if (tx.type === 'topup') return 'Recarga'
  if (tx.type === 'purchase') return tx.stationName ?? 'Compra'
  if (tx.type === 'reversal') return 'Devolución'
  return 'Movimiento'
}

function txSubLabel(tx: Transaction): string {
  if (tx.type === 'topup') {
    const method = tx.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'
    return method
  }
  if (tx.type === 'purchase') return 'Compra'
  if (tx.type === 'reversal') return 'Reversión'
  return ''
}
