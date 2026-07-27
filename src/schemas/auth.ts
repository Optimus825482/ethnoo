import { z } from 'zod'
import { passwordSchema } from './password'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username required').max(50),
  password: z.string().min(1, 'Password required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
  email: z.string().email('Geçerli bir e-posta adresi girin').max(255).optional(),
})
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
