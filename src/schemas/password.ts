import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(6, "Şifre en az 6 karakter olmalıdır")
  .regex(/[A-Za-z]/, "Şifre en az bir harf içermelidir")
  .regex(/\d/, "Şifre en az bir rakam içermelidir");
