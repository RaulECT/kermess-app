import type { Timestamp } from './timestamp'

export interface User {
  id: string // UUID v4 = qrToken
  name: string
  phone: string
  qrToken: string // UUID que va en el QR (= userId)
  balance: number // cupones disponibles
  totalLoaded: number // cupones totales cargados histórico
  createdAt: Timestamp
  createdBy: string // operatorId de caja
}
