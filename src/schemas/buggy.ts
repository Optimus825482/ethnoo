import { z } from 'zod'

const buggyStatusEnum = z.enum(['AVAILABLE', 'BUSY', 'OFFLINE', 'MAINTENANCE'])

const booleanQuery = z
  .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === true || v === 'true' || v === '1')
  .optional()

export const createBuggySchema = z.object({
  code: z.string().min(1, 'Code required').max(50),
  model: z.string().max(100).optional(),
  licensePlate: z.string().max(50).optional(),
  icon: z.string().max(10).optional(),
  status: buggyStatusEnum.default('AVAILABLE'),
  currentLocationId: z.number().int().positive().optional(),
  isActive: z.boolean().default(true),
})
export type CreateBuggyInput = z.infer<typeof createBuggySchema>

export const updateBuggySchema = z.object({
  hotelId: z.number().int().positive().optional(),
  code: z.string().min(1).max(50).optional(),
  model: z.string().max(100).optional(),
  licensePlate: z.string().max(50).optional(),
  icon: z.string().max(10).optional(),
  status: buggyStatusEnum.optional(),
  currentLocationId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
})
export type UpdateBuggyInput = z.infer<typeof updateBuggySchema>

export const assignDriverSchema = z.object({
  buggyId: z.number().int().positive(),
  driverId: z.number().int().positive(),
  isPrimary: z.boolean().default(false),
})
export type AssignDriverInput = z.infer<typeof assignDriverSchema>

export const buggyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  status: buggyStatusEnum.optional(),
  isActive: booleanQuery,
})
export type BuggyQuery = z.infer<typeof buggyQuerySchema>
