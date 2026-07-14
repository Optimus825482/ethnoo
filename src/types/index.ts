import type {
  Hotel,
  User,
  Location,
  Buggy,
  BuggyDriver,
  BuggyRequest,
  AuditTrail,
  Session,
  NotificationLog,
  SystemSetting,
  UserRole,
  BuggyStatus,
  RequestStatus,
  CancelledBy,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
} from '@prisma/client'

export type {
  Hotel,
  User,
  Location,
  Buggy,
  BuggyDriver,
  BuggyRequest,
  AuditTrail,
  Session,
  NotificationLog,
  SystemSetting,
  UserRole,
  BuggyStatus,
  RequestStatus,
  CancelledBy,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
}

// API response type
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// Auth context passed to authenticated handlers
export interface AuthContext {
  user: {
    id: number
    hotelId: number
    username: string
    role: 'ADMIN' | 'DRIVER'
    fullName: string
  }
  session: {
    id: number
    tokenHash: string
    expiresAt: Date
  }
}

// SSE event types
export type SSEEvent =
  | { type: 'connected'; driverId?: number; requestId?: number }
  | { type: 'new_request'; request: BuggyRequest }
  | { type: 'request_accepted'; requestId: number; driverName: string }
  | { type: 'request_completed'; requestId: number }
  | { type: 'request_cancelled'; requestId: number }
  | { type: 'request_timeout'; requestId: number }
  | { type: 'buggy_status_change'; buggyId: number; status: BuggyStatus }
  | { type: 'heartbeat' }
