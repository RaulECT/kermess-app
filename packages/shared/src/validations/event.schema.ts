import { z } from 'zod'

export const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  target: z.number().positive(),
  raised: z.number().min(0),
})

export const eventConfigSchema = z.object({
  name: z.string().min(1),
  couponRate: z.number().positive(),
  goals: z.array(goalSchema).length(3),
  totalRaised: z.number().min(0),
  status: z.enum(['setup', 'live', 'closed']),
  startedAt: z.any().nullable(),
  endedAt: z.any().nullable(),
})

export const updateConfigSchema = z.object({
  adminPin: z.string().min(4).max(6),
  patch: z.object({
    name: z.string().min(1).optional(),
    couponRate: z.number().positive().optional(),
    status: z.enum(['setup', 'live', 'closed']).optional(),
    goals: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          target: z.number().positive(),
        })
      )
      .length(3)
      .optional(),
  }),
})

export type UpdateConfigInput = z.infer<typeof updateConfigSchema>
