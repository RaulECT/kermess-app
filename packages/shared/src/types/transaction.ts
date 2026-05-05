import type { Timestamp } from './timestamp'

export type TransactionType = 'topup' | 'purchase' | 'reversal'
export type PaymentMethod = 'cash' | 'transfer'

export interface TransactionItem {
  name: string
  price: number
  qty: number
}

interface BaseTransaction {
  id: string
  userId: string
  userName: string // denormalizado para reportes
  amount: number // cupones (positivo = ingreso al user, negativo = gasto)
  clientTxId: string // idempotencia
  reversedByTx?: string // si esta tx fue revertida
  timestamp: Timestamp
}

export interface TopupTransaction extends BaseTransaction {
  type: 'topup'
  pesosReceived: number
  paymentMethod: PaymentMethod
  goalId: string
  cashierId: string
}

export interface PurchaseTransaction extends BaseTransaction {
  type: 'purchase'
  stationId: string
  stationName: string
  items?: TransactionItem[] // solo si estación con menú
}

export interface ReversalTransaction extends BaseTransaction {
  type: 'reversal'
  reverses: string // txId original
  reason: string
  reversedBy: string // adminId
}

export type Transaction = TopupTransaction | PurchaseTransaction | ReversalTransaction
