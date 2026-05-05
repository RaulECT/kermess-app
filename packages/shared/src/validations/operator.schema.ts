import { z } from 'zod'

export const createOperatorSchema = z.object({
  adminPin: z.string().min(4).max(6),
  name: z.string().min(2).max(100),
  pin: z.string().min(4).max(6),
})

export const createAdminSchema = z.object({
  adminPin: z.string().min(4).max(6),
  name: z.string().min(2).max(100),
  pin: z.string().min(4).max(6),
})

export const closeEventSchema = z.object({
  adminPin: z.string().min(4).max(6),
})

export type CreateOperatorInput = z.infer<typeof createOperatorSchema>
export type CreateAdminInput = z.infer<typeof createAdminSchema>
export type CloseEventInput = z.infer<typeof closeEventSchema>
