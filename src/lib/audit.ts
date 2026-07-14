import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export interface AuditParams {
  hotelId: number;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditTrail.create({
      data: {
        hotelId: params.hotelId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues as
          | Prisma.InputJsonValue
          | undefined,
        newValues: params.newValues as
          | Prisma.InputJsonValue
          | undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    // Audit logging must never break the main operation.
    console.error("[Audit] Failed to log:", err);
  }
}

/**
 * Wraps a state-changing operation with automatic audit logging.
 * On success the audit is written; on failure the error propagates
 * and no audit row is created.
 *
 * @example
 * const updated = await auditMiddleware({
 *   hotelId: ctx.auth.hotelId,
 *   userId: ctx.auth.user.id,
 *   action: "UPDATE_BUGGY",
 *   entityType: "Buggy",
 *   entityId: buggyId,
 *   oldValues: { status: oldStatus },
 *   newValues: { status: newStatus },
 *   ipAddress: req.headers.get("x-forwarded-for"),
 * }, async () => prisma.buggy.update({ where: { id: buggyId }, data: { status: newStatus } }));
 */
export async function auditMiddleware<T>(
  params: AuditParams,
  operation: () => Promise<T>,
): Promise<T> {
  const result = await operation();
  await logAudit(params);
  return result;
}
