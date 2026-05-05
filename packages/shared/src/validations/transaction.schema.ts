import { z } from 'zod'

export const transactionItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  qty: z.number().int().positive(),
})

export const chargeSchema = z.object({
  operatorPin: z.string().min(4).max(6),
  stationId: z.string().min(1),
  userId: z.string().uuid(),
  clientTxId: z.string().uuid(),
  items: z.array(transactionItemSchema).optional(),
})

export const reverseTransactionSchema = z.object({
  adminPin: z.string().min(4).max(6),
  txId: z.string().min(1),
  reason: z.string().min(5).max(500),
})

export type ChargeInput = z.infer<typeof chargeSchema>
export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>
