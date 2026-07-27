import { NextRequest } from "next/server";
import { createLocationSchema, locationQuerySchema } from "@/schemas/location";
import { LocationService } from "@/services/location-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, withRateLimit, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const params = locationQuerySchema.parse({
    search: url.searchParams.get("search") || undefined,
    isActive: url.searchParams.get("isActive") || undefined,
    page: url.searchParams.get("page") || "1",
    pageSize: url.searchParams.get("pageSize") || "50",
  });

  const result = await LocationService.list(ctx.user!.hotelId, params);
  return apiSuccess(result);
}));

export const POST = toRouteHandler(withRateLimit(
  "create-location",
  { limit: 20, window: 60 },
  withAuth(async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const result = createLocationSchema.safeParse(body);
      if (!result.success) {
        const err = result.error.issues[0];
        return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
      }
      const data = result.data;
      const location = await LocationService.create(ctx.user!.hotelId, data, ctx.user!.id);
      return apiSuccess(location, 201);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 500;
      return apiError(err instanceof Error ? err.message : "Failed", status);
    }
  }, { role: "ADMIN" }),
));
