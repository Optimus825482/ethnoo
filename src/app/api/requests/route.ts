import { NextRequest } from "next/server";
import { z } from "zod";
import { createRequestSchema, requestQuerySchema } from "@/schemas/request";
import { RequestService } from "@/services/request-service";
import { apiSuccess, apiError, ApiError } from "@/lib/api-response";
import { withAuth, withValidation, withRateLimit, toRouteHandler } from "@/lib/middleware";
import { prisma } from "@/lib/db";

async function getHotelIdFromLocation(locationId: number): Promise<number> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { hotelId: true },
  });
  if (!location) throw new ApiError(404, "Location not found", "LOCATION_NOT_FOUND");
  return location.hotelId;
}

// Public POST — guest creates request (no auth required)
export const POST = toRouteHandler(withRateLimit(
  "create-request",
  { limit: 10, window: 60 },
  withValidation(createRequestSchema, async (req, vctx) => {
    const data = vctx.data as z.infer<typeof createRequestSchema>;
    try {
      const ipAddress = req.headers.get("x-forwarded-for") || undefined;
      const hotelId = await getHotelIdFromLocation(data.locationId);
      const request = await RequestService.create(hotelId, data, ipAddress);
      return apiSuccess(request, 201);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 500;
      return apiError(err instanceof Error ? err.message : "Failed", status);
    }
  }),
));

// Authenticated GET — list requests
export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const params = requestQuerySchema.parse({
    status: url.searchParams.get("status") || undefined,
    driverId: url.searchParams.get("driverId") || undefined,
    locationId: url.searchParams.get("locationId") || undefined,
    dateFrom: url.searchParams.get("dateFrom") || undefined,
    dateTo: url.searchParams.get("dateTo") || undefined,
    page: url.searchParams.get("page") || "1",
    pageSize: url.searchParams.get("pageSize") || "50",
  });
  const result = await RequestService.list(ctx.user!.hotelId, params);
  return apiSuccess(result);
}));
