import { z } from 'zod'

const requestStatusEnum = z.enum([
  'PENDING',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'UNANSWERED',
])

export const createRequestSchema = z.object({
  locationId: z.number().int().positive(),
  guestName: z.string().max(255).optional(),
  roomNumber: z.string().max(50).optional(),
  hasRoom: z.boolean().default(true),
  phone: z.string().max(50).optional(),
  notes: z.string().optional(),
  guestFcmToken: z.string().max(500).optional(),
})
export type CreateRequestInput = z.infer<typeof createRequestSchema>

export const acceptRequestSchema = z.object({
  // ponytail: only buggyId needed for accept; driver comes from AuthContext.
  buggyId: z.number().int().positive(),
})
export type AcceptRequestInput = z.infer<typeof acceptRequestSchema>

export const completeRequestSchema = z.object({
  completionLocationId: z.number().int().positive().optional(),
})
export type CompleteRequestInput = z.infer<typeof completeRequestSchema>

export const cancelRequestSchema = z.object({
  reason: z.string().max(1000).optional(),
})
export type CancelRequestInput = z.infer<typeof cancelRequestSchema>

export const requestQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: requestStatusEnum.optional(),
  driverId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
})
export type RequestQuery = z.infer<typeof requestQuerySchema>
