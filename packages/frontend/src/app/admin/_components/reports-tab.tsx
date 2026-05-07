'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { db } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPesos } from '@/lib/utils/formatters'
import type { Transaction, TopupTransaction, PurchaseTransaction, EventConfig } from '@kermess/shared'

type TxWithId = Transaction & { id: string }

function exportXLSX(params: {
  totalPesos: number
  topups: (TopupTransaction & { id: string })[]
  purchases: (PurchaseTransaction & { id: string })[]
  totalCouponsIssued: number
  totalCouponsSpent: number
  byCash: number
  byTransfer: number
  byGoal: { id: string; name: string; target: number; raised: number; txCount: number }[]
  byStation: { name: string; sales: number; coupons: number }[]
  hourly: [string, number][]
}) {
  const wb = XLSX.utils.book_new()

  // Hoja 1 — KPIs
  const kpiSheet = XLSX.utils.aoa_to_sheet([
    ['Métrica', 'Valor'],
    ['Total recaudado ($)', params.totalPesos],
    ['Recargas realizadas', params.topups.length],
    ['Cupones emitidos', params.totalCouponsIssued],
    ['Cupones gastados', params.totalCouponsSpent],
    ['Saldo activo (sin gastar)', params.totalCouponsIssued - params.totalCouponsSpent],
    ['Cobros en estación', params.purchases.length],
  ])
  XLSX.utils.book_append_sheet(wb, kpiSheet, 'Resumen')

  // Hoja 2 — Por meta
  const goalSheet = XLSX.utils.aoa_to_sheet([
    ['Meta', 'Objetivo ($)', 'Recaudado ($)', 'Recargas', '% Avance'],
    ...params.byGoal.map((g) => [
      g.name,
      g.target,
      g.raised,
      g.txCount,
      g.target > 0 ? Math.round((g.raised / g.target) * 100) : 0,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, goalSheet, 'Por meta')

  // Hoja 3 — Por método de pago
  const methodSheet = XLSX.utils.aoa_to_sheet([
    ['Método', 'Total recaudado ($)'],
    ['Efectivo', params.byCash],
    ['Transferencia', params.byTransfer],
  ])
  XLSX.utils.book_append_sheet(wb, methodSheet, 'Método de pago')

  // Hoja 4 — Por estación
  const stationSheet = XLSX.utils.aoa_to_sheet([
    ['Estación', 'Ventas', 'Cupones cobrados'],
    ...params.byStation.map((s) => [s.name, s.sales, s.coupons]),
  ])
  XLSX.utils.book_append_sheet(wb, stationSheet, 'Por estación')

  // Hoja 5 — Por hora
  const hourSheet = XLSX.utils.aoa_to_sheet([
    ['Hora', 'Recaudado ($)'],
    ...params.hourly.map(([h, v]) => [`${h}:00`, v]),
  ])
  XLSX.utils.book_append_sheet(wb, hourSheet, 'Por hora')

  XLSX.writeFile(wb, `reporte-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function ReportsTab() {
  const [txs, setTxs] = useState<TxWithId[]>([])
  const [config, setConfig] = useState<EventConfig | null>(null)

  useEffect(() => {
    let unsubConfig: (() => void) | undefined
    let unsubTxs: (() => void) | undefined
    let active = true

    function setup() {
      unsubConfig?.()
      unsubTxs?.()
      unsubConfig = onSnapshot(doc(db, 'config', 'event'), (snap) => {
        if (snap.exists()) setConfig(snap.data() as EventConfig)
      }, () => { if (active) setup() })
      const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'))
      unsubTxs = onSnapshot(q, (snap) => {
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
      unsubConfig?.()
      unsubTxs?.()
      document.removeEventListener('visibilitychange', reconnect)
      window.removeEventListener('online', reconnect)
    }
  }, [])

  const topups = txs.filter((t): t is TopupTransaction & { id: string } => t.type === 'topup')
  const purchases = txs.filter((t): t is PurchaseTransaction & { id: string } => t.type === 'purchase')

  const totalPesos = topups.reduce((s, t) => s + t.pesosReceived, 0)
  const totalCouponsIssued = topups.reduce((s, t) => s + t.amount, 0)
  const totalCouponsSpent = purchases.reduce((s, t) => s + Math.abs(t.amount), 0)

  // By goal
  const byGoal = config?.goals.map((g) => ({
    ...g,
    txCount: topups.filter((t) => t.goalId === g.id).length,
  })) ?? []

  // By payment method
  const byCash = topups.filter((t) => t.paymentMethod === 'cash').reduce((s, t) => s + t.pesosReceived, 0)
  const byTransfer = topups.filter((t) => t.paymentMethod === 'transfer').reduce((s, t) => s + t.pesosReceived, 0)

  // By station
  const stationMap = new Map<string, { name: string; sales: number; coupons: number }>()
  for (const t of purchases) {
    const existing = stationMap.get(t.stationId) ?? { name: t.stationName, sales: 0, coupons: 0 }
    stationMap.set(t.stationId, {
      name: t.stationName,
      sales: existing.sales + 1,
      coupons: existing.coupons + Math.abs(t.amount),
    })
  }
  const byStation = [...stationMap.values()].sort((a, b) => b.coupons - a.coupons)

  // By hour
  const byHour = new Map<string, number>()
  for (const t of topups) {
    if (!t.timestamp) continue
    const ts = (t.timestamp as { toDate?: () => Date }).toDate?.()
    if (!ts) continue
    const h = ts.toLocaleTimeString('es-MX', { hour: '2-digit', hour12: false, timeZone: 'America/Mexico_City' })
    byHour.set(h, (byHour.get(h) ?? 0) + t.pesosReceived)
  }
  const hourly = [...byHour.entries()].sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={txs.length === 0}
          onClick={() => exportXLSX({
            totalPesos,
            topups,
            purchases,
            totalCouponsIssued,
            totalCouponsSpent,
            byCash,
            byTransfer,
            byGoal,
            byStation,
            hourly,
          })}
        >
          ⬇ Exportar Excel
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total recaudado', value: formatPesos(totalPesos), sub: `${topups.length} recargas` },
          { label: 'Cupones emitidos', value: totalCouponsIssued.toLocaleString('es-MX'), sub: 'en total' },
          { label: 'Cupones gastados', value: totalCouponsSpent.toLocaleString('es-MX'), sub: `${purchases.length} cobros` },
          { label: 'Saldo activo', value: (totalCouponsIssued - totalCouponsSpent).toLocaleString('es-MX'), sub: 'sin gastar' },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-extrabold tabular-nums">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Por meta */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Por meta</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {byGoal.map((g) => {
              const pct = g.target > 0 ? Math.min((g.raised / g.target) * 100, 100) : 0
              return (
                <div key={g.id} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="tabular-nums">{formatPesos(g.raised)} / {formatPesos(g.target)}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{g.txCount} recargas · {Math.round(pct)}%</p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Método de pago */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Por método de pago</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {[
              { label: 'Efectivo', value: byCash, icon: '💵' },
              { label: 'Transferencia', value: byTransfer, icon: '📱' },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span>{m.icon}</span>
                  <span className="font-medium">{m.label}</span>
                </div>
                <span className="tabular-nums font-semibold">{formatPesos(m.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Por estación */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Por estación</CardTitle></CardHeader>
          <CardContent>
            {byStation.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas aún</p>
            ) : (
              <div className="flex flex-col gap-2">
                {byStation.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.coupons} cupones · {s.sales} ventas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por hora */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Recaudación por hora</CardTitle></CardHeader>
          <CardContent>
            {hourly.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos aún</p>
            ) : (
              <div className="flex flex-col gap-2">
                {hourly.map(([h, v]) => {
                  const maxVal = Math.max(...hourly.map(([, n]) => n))
                  const pct = maxVal > 0 ? (v / maxVal) * 100 : 0
                  return (
                    <div key={h} className="flex items-center gap-3 text-sm">
                      <span className="w-12 text-right tabular-nums text-muted-foreground">{h}h</span>
                      <div className="flex-1 h-5 rounded bg-muted overflow-hidden">
                        <div className="h-full rounded bg-violet-400" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-20 text-right tabular-nums">{formatPesos(v)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
