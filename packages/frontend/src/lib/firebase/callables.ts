import { httpsCallable, FunctionsError } from 'firebase/functions'
import { functions, ensureAuth } from './client'

const RETRYABLE_CODES = new Set(['unavailable', 'deadline-exceeded', 'internal'])

async function call<TInput, TOutput>(name: string, data: TInput, maxRetries = 2): Promise<TOutput> {
  await ensureAuth()
  const fn = httpsCallable<TInput, TOutput>(functions, name)
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn(data)
      return result.data
    } catch (e) {
      lastError = e
      const code = (e as FunctionsError).code?.replace('functions/', '')
      if (!RETRYABLE_CODES.has(code) || attempt === maxRetries) break
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt))
    }
  }
  throw lastError
}

// Admin
export const adminLogin = (data: { pin: string }) =>
  call<{ pin: string }, { adminId: string; name: string }>('adminLogin', data)

export const createInitialAdmin = (data: { name: string; pin: string }) =>
  call<{ name: string; pin: string }, { adminId: string; name: string }>('createInitialAdmin', data)

export const updateConfig = (data: {
  adminPin: string
  patch: {
    name?: string
    couponRate?: number
    status?: 'setup' | 'live' | 'closed'
    goals?: Array<{ id: string; name: string; target: number }>
  }
}) => call<typeof data, { success: boolean }>('updateConfig', data)

export const upsertStation = (data: {
  adminPin: string
  station: {
    id?: string
    name: string
    type: 'simple' | 'menu'
    simplePrice: number | null
    menu: Array<{ id: string; name: string; price: number; active: boolean }> | null
    operatorPin?: string
    active: boolean
    order: number
  }
}) => call<typeof data, { stationId: string }>('upsertStation', data)

export const createOperator = (data: { adminPin: string; name: string; pin: string }) =>
  call<typeof data, { operatorId: string }>('createOperator', data)

export const createAdmin = (data: { adminPin: string; name: string; pin: string }) =>
  call<typeof data, { adminId: string }>('createAdmin', data)

export const listStaff = (data: { adminPin: string }) =>
  call<typeof data, { operators: Array<{ id: string; name: string; role: 'cashier' }>; admins: Array<{ id: string; name: string; role: 'admin' }> }>('listStaff', data)

// Caja
export const cashierLogin = (data: { pin: string }) =>
  call<{ pin: string }, { cashierId: string; name: string }>('cashierLogin', data)

export const registerUser = (data: { cashierPin: string; name: string; phone: string }) =>
  call<typeof data, { userId: string; qrToken: string }>('registerUser', data)

export const topup = (data: {
  cashierPin: string
  userId: string
  pesos: number
  paymentMethod: 'cash' | 'transfer'
  goalId: string
  clientTxId: string
}) => call<typeof data, { txId: string; coupons: number; idempotent?: boolean }>('topup', data)

// Estación
export const stationLogin = (data: { stationId: string; operatorPin: string }) =>
  call<typeof data, {
    stationId: string
    name: string
    type: 'simple' | 'menu'
    simplePrice: number | null
    menu: Array<{ id: string; name: string; price: number; active: boolean }> | null
  }>('stationLogin', data)

export const charge = (data: {
  operatorPin: string
  stationId: string
  userId: string
  clientTxId: string
  items?: Array<{ name: string; price: number; qty: number }>
}) => call<typeof data, { txId: string; couponsCharged: number; idempotent?: boolean }>('charge', data)

// Admin avanzado
export const reverseTransaction = (data: { adminPin: string; txId: string; reason: string }) =>
  call<typeof data, { reversalId: string }>('reverseTransaction', data)

export const resetSystem = (data: { adminPin: string }) =>
  call<typeof data, { ok: boolean }>('resetSystem', data)

export const resendUserLink = (data: { cashierPin: string; userId: string }) =>
  call<typeof data, { ok: boolean }>('resendUserLink', data)
