'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { formatTimestamp, formatTimestampRelative } from '@/lib/utils/formatters'

type SystemError = {
  id: string
  function: string
  code: string
  message: string
  context: Record<string, unknown>
  resolved: boolean
  timestamp: Timestamp | null
}

const FUNCTION_LABEL: Record<string, string> = {
  registerUser: 'Registro',
  topup: 'Recarga',
  charge: 'Cobro',
  unknown: 'Desconocida',
}

const CODE_COLOR: Record<string, string> = {
  internal: 'bg-red-500/20 text-red-400 border-red-500/30',
  'failed-precondition': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  unauthenticated: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'not-found': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'invalid-argument': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

function formatContext(ctx: Record<string, unknown>): string {
  const safe = { ...ctx }
  const parts: string[] = []
  if (safe.userId) parts.push(`usuario: ${String(safe.userId).slice(0, 8)}…`)
  if (safe.stationId) parts.push(`estación: ${String(safe.stationId).slice(0, 8)}…`)
  if (safe.pesos) parts.push(`$${safe.pesos} MXN`)
  if (safe.phone) parts.push(`tel: ${safe.phone}`)
  if (safe.name) parts.push(`nombre: ${safe.name}`)
  if (safe.clientTxId) parts.push(`tx: ${String(safe.clientTxId).slice(0, 8)}…`)
  return parts.join(' · ') || '—'
}

function twoHoursAgo(): number {
  return Date.now() - 2 * 60 * 60 * 1000
}

export function MonitorDashboard() {
  const [errors, setErrors] = useState<SystemError[]>([])
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      const q = query(
        collection(db, 'systemErrors'),
        orderBy('timestamp', 'desc'),
        limit(50),
      )
      unsub = onSnapshot(
        q,
        (snap) => {
          setErrors(
            snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<SystemError, 'id'>),
            })),
          )
        },
        () => {
          if (active) setup()
        },
      )
    }

    function reconnect() {
      if (active) setup()
    }

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

  async function markResolved(id: string) {
    setResolving((prev) => new Set(prev).add(id))
    try {
      await updateDoc(doc(db, 'systemErrors', id), { resolved: true })
    } finally {
      setResolving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const recentUnresolved = errors.filter(
    (e) =>
      !e.resolved &&
      e.timestamp &&
      e.timestamp.toMillis() > twoHoursAgo(),
  )

  const systemOk = recentUnresolved.length === 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 pb-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
              <span className="text-[14px] font-bold text-white">K</span>
            </div>
            <span className="text-[16px] font-semibold">Monitor</span>
          </div>
          <span className="text-[11px] text-gray-500">Kermess 2026</span>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            systemOk
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              systemOk ? 'bg-green-400' : 'bg-red-400 animate-pulse'
            }`}
          />
          <span className={`text-[14px] font-medium ${systemOk ? 'text-green-300' : 'text-red-300'}`}>
            {systemOk
              ? 'Sistema OK — sin errores recientes'
              : `${recentUnresolved.length} error${recentUnresolved.length !== 1 ? 'es' : ''} en las últimas 2h`}
          </span>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 flex-wrap">
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-[12px] text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Firebase Console ↗
          </a>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-[12px] text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Vercel Dashboard ↗
          </a>
        </div>

        {/* Error list */}
        <div className="flex flex-col gap-2">
          <p className="text-[12px] text-gray-500">
            {errors.length === 0 ? 'Sin errores registrados' : `${errors.length} error${errors.length !== 1 ? 'es' : ''} (últimos 50)`}
          </p>

          {errors.map((err) => (
            <div
              key={err.id}
              className={`rounded-xl border p-4 flex flex-col gap-2 transition-opacity ${
                err.resolved ? 'opacity-40' : ''
              } border-gray-800 bg-gray-900`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-gray-200">
                    {FUNCTION_LABEL[err.function] ?? err.function}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                      CODE_COLOR[err.code] ?? 'bg-gray-700 text-gray-300 border-gray-600'
                    }`}
                  >
                    {err.code}
                  </span>
                  {err.resolved && (
                    <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-[11px] text-gray-500">
                      resuelto
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500 whitespace-nowrap shrink-0">
                  {err.timestamp ? formatTimestampRelative(err.timestamp) : ''}
                </span>
              </div>

              <p className="text-[13px] text-gray-300 leading-snug">{err.message}</p>

              <p className="text-[11px] text-gray-500">{formatContext(err.context)}</p>

              {err.timestamp && (
                <p className="text-[11px] text-gray-600">{formatTimestamp(err.timestamp)}</p>
              )}

              {!err.resolved && (
                <button
                  onClick={() => markResolved(err.id)}
                  disabled={resolving.has(err.id)}
                  className="self-start rounded-lg border border-gray-700 bg-gray-800 px-3 py-1 text-[12px] text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors disabled:opacity-50"
                >
                  {resolving.has(err.id) ? 'Guardando…' : 'Marcar resuelto'}
                </button>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
