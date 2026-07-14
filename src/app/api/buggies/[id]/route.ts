import { NextRequest } from "next/server";
import { updateBuggySchema } from "@/schemas/buggy";
import { BuggyService } from "@/services/buggy-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const buggy = await BuggyService.getById(ctx.user!.hotelId, Number(ctx.params!.id));
    return apiSuccess(buggy);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}));

export const PUT = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = updateBuggySchema.safeParse(body);
    if (!result.success) {
      const err = result.error.issues[0];
      return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    const data = result.data;
    const buggy = await BuggyService.update(ctx.user!.hotelId, Number(ctx.params!.id), data, ctx.user!.id);
    return apiSuccess(buggy);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const result = await BuggyService.delete(ctx.user!.hotelId, Number(ctx.params!.id), ctx.user!.id);
    return apiSuccess(result);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}));
