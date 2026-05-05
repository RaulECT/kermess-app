import { z } from 'zod'

export const registerUserSchema = z.object({
  cashierPin: z.string().min(4).max(6),
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
})

export const topupSchema = z.object({
  cashierPin: z.string().min(4).max(6),
  userId: z.string().uuid(),
  pesos: z.number().positive(),
  paymentMethod: z.enum(['cash', 'transfer']),
  goalId: z.string().min(1),
  clientTxId: z.string().uuid(), // idempotencia
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>
export type TopupInput = z.infer<typeof topupSchema>
