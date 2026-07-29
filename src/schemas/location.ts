import { z } from 'zod'

const booleanQuery = z
  .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === true || v === 'true' || v === '1')
  .optional()

export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  logo: z.string().max(500000).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mapX: z.number().int().min(0).max(960).optional(),
  mapY: z.number().int().min(0).max(1097).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})
export type CreateLocationInput = z.infer<typeof createLocationSchema>

export const updateLocationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  logo: z.string().max(500000).nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mapX: z.number().int().min(0).max(960).nullable().optional(),
  mapY: z.number().int().min(0).max(1097).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

export const locationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  isActive: booleanQuery,
})
export type LocationQuery = z.infer<typeof locationQuerySchema>
