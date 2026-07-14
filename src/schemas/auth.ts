import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username required').max(50),
  password: z.string().min(1, 'Password required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
