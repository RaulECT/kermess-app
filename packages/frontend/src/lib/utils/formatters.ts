import { format, formatDistanceToNow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type { Timestamp } from 'firebase/firestore'

const TIMEZONE = 'America/Mexico_City'

export function formatTimestamp(ts: Timestamp): string {
  const date = toZonedTime(ts.toDate(), TIMEZONE)
  return format(date, "d 'de' MMMM, HH:mm", { locale: es })
}

export function formatTimestampRelative(ts: Timestamp): string {
  const date = toZonedTime(ts.toDate(), TIMEZONE)
  return formatDistanceToNow(date, { addSuffix: true, locale: es })
}

export function formatCoupons(amount: number): string {
  return `${amount.toLocaleString('es-MX')} ${amount === 1 ? 'cupón' : 'cupones'}`
}

export function formatPesos(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount)
}
