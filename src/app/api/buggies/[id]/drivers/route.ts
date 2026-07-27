import { NextRequest } from "next/server";
import { z } from "zod";
import { BuggyService } from "@/services/buggy-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

const assignSchema = z.object({
  driverId: z.number().int().positive(),
  isPrimary: z.boolean().default(false),
});

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const drivers = await BuggyService.listDrivers(ctx.user!.hotelId);
  return apiSuccess(drivers);
}));

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = assignSchema.safeParse(body);
    if (!result.success) {
      const err = result.error.issues[0];
      return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    const data = result.data;
    const assignment = await BuggyService.assignDriver(
      ctx.user!.hotelId,
      Number(ctx.params!.id),
      data.driverId,
      data.isPrimary,
      ctx.user!.id,
    );
    return apiSuccess(assignment, 201);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const driverId = Number(url.searchParams.get("driverId"));
  if (!driverId) return apiError("driverId query param required", 400);

  try {
    const result = await BuggyService.unassignDriver(
      ctx.user!.hotelId,
      Number(ctx.params!.id),
      driverId,
      ctx.user!.id,
    );
    return apiSuccess(result);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));
