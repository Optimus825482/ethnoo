import { NextRequest } from "next/server";
import { LocationService } from "@/services/location-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const POST = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const location = await LocationService.generateQR(ctx.user!.hotelId, Number(ctx.params!.id), ctx.user!.id);
    return apiSuccess(location);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const location = await LocationService.clearQR(ctx.user!.hotelId, Number(ctx.params!.id), ctx.user!.id);
    return apiSuccess(location);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));
