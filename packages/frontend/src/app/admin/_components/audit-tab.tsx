'use client'

import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { formatTimestamp } from '@/lib/utils/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AuditLog, AuditAction, ActorRole } from '@kermess/shared'

type LogWithId = AuditLog & { id: string }

const ACTION_LABEL: Record<AuditAction, string> = {
  charge:               'Cobro en estación',
  topup:                'Recarga de cupones',
  create_user:          'Registro de asistente',
  reverse_tx:           'Reversión de transacción',
  update_config:        'Actualización de evento',
  upsert_station:       'Configuración de estación',
  create_operator:      'Nuevo operador de caja',
  create_admin:         'Nuevo administrador',
  close_event:          'Cierre de evento',
  update_station_status:'Cambio de estado de estación',
  reset_system:         'Reset del sistema',
}

const ROLE_LABEL: Record<ActorRole, string> = {
  admin:    'Admin',
  cashier:  'Cajero',
  operator: 'Operador',
}

const ROLE_VARIANT: Record<ActorRole, 'default' | 'secondary' | 'outline'> = {
  admin:    'default',
  cashier:  'secondary',
  operator: 'outline',
}

const TARGET_LABEL: Record<string, string> = {
  user:        'Asistente',
  transaction: 'Transacción',
  station:     'Estación',
  operator:    'Operador',
  admin:       'Admin',
  config:      'Configuración',
}

function formatDetails(action: AuditAction, details: Record<string, unknown>): string {
  switch (action) {
    case 'charge':
      return [
        `${details.totalCost} cupones`,
        details.stationName ? `· ${details.stationName}` : null,
      ].filter(Boolean).join(' ')

    case 'topup':
      return [
        `$${details.pesos} MXN → ${details.coupons} cupones`,
        details.paymentMethod === 'cash' ? '· Efectivo' : '· Transferencia',
      ].filter(Boolean).join(' ')

    case 'create_user':
      return [details.name, details.phone].filter(Boolean).join(' · ')

    case 'reverse_tx':
      return `Motivo: ${details.reason ?? '—'}`

    case 'upsert_station':
      return [details.name, details.isNew ? '(nueva)' : '(editada)'].filter(Boolean).join(' ')

    case 'create_operator':
    case 'create_admin':
      return String(details.name ?? '')

    case 'update_config':
      return `Campos: ${Object.keys(details).join(', ')}`

    case 'update_station_status':
      return String(details.active ? 'Activada' : 'Desactivada')

    default:
      return ''
  }
}

function exportCSV(logs: LogWithId[]) {
  const headers = ['Fecha', 'Acción', 'Rol', 'Actor', 'Destino', 'Tipo destino', 'Detalles']
  const rows = logs.map((log) => {
    const ts = log.timestamp
      ? formatTimestamp(log.timestamp as Timestamp)
      : ''
    const actor = log.actorName ?? log.actorId
    const target = log.targetName ?? log.targetId
    const details = formatDetails(log.action, log.details)
    return [
      ts,
      ACTION_LABEL[log.action] ?? log.action,
      ROLE_LABEL[log.actorRole] ?? log.actorRole,
      actor,
      target,
      TARGET_LABEL[log.targetType] ?? log.targetType,
      details,
    ]
  })
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditTab() {
  const [logs, setLogs] = useState<LogWithId[]>([])

  useEffect(() => {
    let unsub: (() => void) | undefined
    let active = true

    function setup() {
      unsub?.()
      const q = query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(200))
      unsub = onSnapshot(q, (snap) => {
        setLogs(snap.docs.map((d) => {
          const { id: _id, ...rest } = d.data() as AuditLog & { id?: string }
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{logs.length} registros (últimos 200)</p>
        <Button size="sm" variant="outline" disabled={logs.length === 0} onClick={() => exportCSV(logs)}>
          ⬇ Exportar CSV
        </Button>
      </div>

      {logs.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Sin registros de auditoría</p>
      )}

      {logs.map((log) => {
        const detailText = formatDetails(log.action, log.details)
        const targetLabel = TARGET_LABEL[log.targetType] ?? log.targetType

        return (
          <div key={log.id} className="flex items-start justify-between rounded-xl border bg-card px-4 py-3 gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={ROLE_VARIANT[log.actorRole] ?? 'outline'} className="text-xs shrink-0">
                  {ROLE_LABEL[log.actorRole] ?? log.actorRole}
                </Badge>
                <span className="text-sm font-medium">
                  {ACTION_LABEL[log.action] ?? log.action}
                </span>
              </div>

              <span className="text-xs text-muted-foreground">
                {ROLE_LABEL[log.actorRole] ?? log.actorRole}{' '}
                <span className="font-medium text-foreground">
                  {log.actorName ?? log.actorId.slice(0, 6)}
                </span>
                {' → '}
                {targetLabel}{' '}
                <span className="font-medium text-foreground">
                  {log.targetName ?? log.targetId.slice(0, 6)}
                </span>
              </span>

              {detailText && (
                <span className="text-xs text-muted-foreground">{detailText}</span>
              )}
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {log.timestamp ? formatTimestamp(log.timestamp as Timestamp) : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}
