import { NextRequest } from "next/server";
import { updateLocationSchema } from "@/schemas/location";
import { LocationService } from "@/services/location-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { prisma } from "@/lib/db";

// Public GET — anyone can fetch a location by ID (e.g. guest scanning a QR code)
export const GET = async (_req: NextRequest) => {
  try {
    const id = Number(_req.url.split("/").filter(Boolean).pop());
    const location = await prisma.location.findFirst({
      where: { id },
      select: { id: true, name: true, logo: true, description: true },
    });
    if (!location) return apiError("Location not found", 404, "LOCATION_NOT_FOUND");
    return apiSuccess(location);
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed", 500);
  }
};

export const PUT = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = updateLocationSchema.safeParse(body);
    if (!result.success) {
      const err = result.error.issues[0];
      return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    const data = result.data;
    const location = await LocationService.update(ctx.user!.hotelId, Number(ctx.params!.id), data, ctx.user!.id);
    return apiSuccess(location);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const result = await LocationService.delete(ctx.user!.hotelId, Number(ctx.params!.id), ctx.user!.id);
    return apiSuccess(result);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}, { role: "ADMIN" }));
