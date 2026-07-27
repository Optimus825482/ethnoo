import { NextRequest } from "next/server";
import { updateUserSchema } from "@/schemas/user";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, ApiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const user = await prisma.user.findFirst({
    where: { id: Number(ctx.params!.id), hotelId: ctx.user!.hotelId },
    select: {
      id: true, username: true, role: true, fullName: true,
      email: true, phone: true, isActive: true, mustChangePassword: true,
      lastLogin: true, createdAt: true,
    },
  });
  if (!user) return apiError("User not found", 404, "USER_NOT_FOUND");
  return apiSuccess(user);
}, { role: "ADMIN" }));

export const PUT = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = updateUserSchema.safeParse(body);
    if (!result.success) {
      const err = result.error.issues[0];
      return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    const data = result.data;

    const existing = await prisma.user.findFirst({
      where: { id: Number(ctx.params!.id), hotelId: ctx.user!.hotelId },
    });
    if (!existing) throw new ApiError(404, "User not found", "USER_NOT_FOUND");

    const user = await prisma.user.update({
      where: { id: Number(ctx.params!.id) },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.mustChangePassword !== undefined && { mustChangePassword: data.mustChangePassword }),
      },
      select: { id: true, username: true, role: true, fullName: true, isActive: true },
    });

    await logAudit({
      hotelId: ctx.user!.hotelId,
      userId: ctx.user!.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: user.id,
      oldValues: { fullName: existing.fullName, isActive: existing.isActive },
      newValues: { fullName: user.fullName, isActive: user.isActive },
    });

    return apiSuccess(user);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: Number(ctx.params!.id), hotelId: ctx.user!.hotelId },
    });
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");
    if (user.id === ctx.user!.id) throw new ApiError(400, "Cannot delete yourself", "CANNOT_DELETE_SELF");

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    await logAudit({
      hotelId: ctx.user!.hotelId,
      userId: ctx.user!.id,
      action: "DELETE_USER",
      entityType: "User",
      entityId: user.id,
    });

    return apiSuccess({ deactivated: true });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));
