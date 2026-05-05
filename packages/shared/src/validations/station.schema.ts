import { z } from 'zod'

export const menuItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().positive(),
  active: z.boolean(),
})

export const upsertStationSchema = z.object({
  adminPin: z.string().min(4).max(6),
  station: z
    .object({
      id: z.string().nullish(), // null | undefined = crear nuevo
      name: z.string().min(1).max(100),
      type: z.enum(['simple', 'menu']),
      simplePrice: z.number().positive().nullable(),
      menu: z.array(menuItemSchema).nullable(),
      operatorPin: z.string().min(4).max(6).optional(), // opcional en updates; requerido en creates (validado en función)
      active: z.boolean(),
      order: z.number().int().min(0),
    })
    .refine(
      (s) => {
        if (s.type === 'simple') return s.simplePrice !== null && s.menu === null
        if (s.type === 'menu') return s.menu !== null && s.simplePrice === null
        return false
      },
      { message: 'simplePrice y menu deben corresponder al tipo de estación' }
    ),
})

export type UpsertStationInput = z.infer<typeof upsertStationSchema>
