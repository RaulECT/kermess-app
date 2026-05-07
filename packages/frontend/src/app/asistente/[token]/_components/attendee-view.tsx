'use client'

import { use, useEffect, useState } from 'react'
import { doc, collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db, ensureAuth } from '@/lib/firebase/client'
import { CountUp } from '@/components/shared/count-up'
import { QRDisplay } from '@/components/shared/qr-display'
import { PwaInstallButton } from './pwa-install-button'
import { TransactionList } from './transaction-list'
import type { User, Transaction } from '@kermess/shared'

interface AttendeeViewProps {
  paramsPromise: Promise<{ token: string }>
}

type Status = 'loading' | 'not-found' | 'ready'

export function AttendeeView({ paramsPromise }: AttendeeViewProps) {
  const { token } = use(paramsPromise)
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<(Transaction & { id: string })[]>([])

  useEffect(() => {
    let unsubUser: (() => void) | undefined
    let unsubTxs: (() => void) | undefined
    let active = true

    function setup() {
      unsubUser?.()
      unsubTxs?.()

      unsubUser = onSnapshot(
        doc(db, 'users', token),
        (snap) => {
          if (!snap.exists()) {
            setStatus('not-found')
            return
          }
          setUser({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) })
          setStatus('ready')
        },
        () => { if (active) setup() }
      )

      const txQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', token),
        orderBy('timestamp', 'desc'),
        limit(50)
      )
      unsubTxs = onSnapshot(
        txQuery,
        (snap) => {
          setTransactions(
            snap.docs.map((d) => {
              const { id: _id, ...rest } = d.data() as Transaction & { id?: string }
              void _id
              return { id: d.id, ...rest }
            })
          )
        },
        () => {}
      )
    }

    function handleVisibilityChange() {
      if (!document.hidden && active) setup()
    }

    ensureAuth()
      .then(() => {
        if (active) {
          setup()
          document.addEventListener('visibilitychange', handleVisibilityChange)
        }
      })
      .catch(() => {})

    return () => {
      active = false
      unsubUser?.()
      unsubTxs?.()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary">
        <div className="flex flex-col items-center gap-3 text-fg-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
          <p className="text-sm">Cargando tus cupones…</p>
        </div>
      </div>
    )
  }

  if (status === 'not-found' || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center bg-surface-primary">
        <div className="text-6xl">🎪</div>
        <h1 className="text-xl font-bold text-fg-primary">Cupón no encontrado</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          El link no es válido o los cupones aún no han sido activados. Acércate al módulo de caja.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[390px] flex-col bg-surface-primary">
      {/* Header con gradiente púrpura */}
      <div
        className="flex flex-col items-center gap-1 px-5 pb-6 pt-10"
        style={{ background: 'linear-gradient(180deg, #A855F733 0%, #0A0A0A 100%)' }}
      >
        {/* Badge evento */}
        <div className="mb-3 flex items-center gap-1 rounded-full bg-[#22C55E1A] px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          <span className="text-[11px] font-medium text-accent-green">Kermess 2026</span>
        </div>
        <h1 className="text-2xl font-bold text-fg-primary">{user.name}</h1>
        {user.phone && (
          <p className="text-[13px] text-fg-secondary">{user.phone}</p>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col gap-5 px-4 pb-4">
        {/* QR Card */}
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface-secondary p-6">
          <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-surface-inverse">
            <QRDisplay value={token} size={160} />
          </div>
          <p className="text-[13px] text-fg-muted">Muestra este código en las estaciones</p>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-5 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-fg-secondary">Saldo disponible</p>
            <CountUp
              value={user.balance}
              formatFn={(n) => `$${n.toLocaleString('es-MX')}`}
              className="font-mono text-3xl font-bold text-fg-primary"
            />
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-[13px] font-medium text-accent-primary">
              {user.balance} cupones
            </p>
            <p className="text-[11px] text-fg-muted">$10 por cupón</p>
          </div>
        </div>

        {/* PWA install */}
        <PwaInstallButton />

        {/* Historial */}
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-fg-primary">Historial de Movimientos</h2>
          <TransactionList transactions={transactions} />
        </div>
      </div>
    </div>
  )
}
