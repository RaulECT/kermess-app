import type { Timestamp } from './timestamp'

export type ActorRole = 'admin' | 'cashier' | 'operator'

export type AuditAction =
  | 'create_user'
  | 'topup'
  | 'charge'
  | 'reverse_tx'
  | 'update_config'
  | 'upsert_station'
  | 'create_operator'
  | 'create_admin'
  | 'close_event'
  | 'update_station_status'

export interface AuditLog {
  id: string
  action: AuditAction
  actorId: string
  actorName?: string
  actorRole: ActorRole
  targetType: string
  targetId: string
  targetName?: string
  details: Record<string, unknown>
  timestamp: Timestamp
}
