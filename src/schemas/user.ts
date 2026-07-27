import { z } from 'zod'
import { passwordSchema } from './password'

// Accepts boolean or 'true'/'false'/'1'/'0' from query strings -> boolean.
const booleanQuery = z
  .union([z.boolean(), z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === true || v === 'true' || v === '1')
  .optional()

export const createUserSchema = z.object({
  username: z.string().min(1, 'Username required').max(50),
  password: passwordSchema,
  role: z.enum(['ADMIN', 'DRIVER']),
  fullName: z.string().min(1, 'Full name required').max(255),
  email: z.email().max(255).optional(),
  phone: z.string().max(50).optional(),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  email: z.email().max(255).optional(),
  phone: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
  mustChangePassword: z.boolean().optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'DRIVER']).optional(),
  isActive: booleanQuery,
})
export type UserQuery = z.infer<typeof userQuerySchema>
