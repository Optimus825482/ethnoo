import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withRateLimit, toRouteHandler } from "@/lib/middleware";

async function handleGetLocationSettings(
  _req: NextRequest,
  ctx: { params?: Record<string, string | string[]> },
) {
  const id = ctx.params?.id as string;
  const locationId = parseInt(id, 10);
  if (isNaN(locationId)) {
    return apiError("Invalid location ID", 400, "INVALID_ID");
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { hotelId: true, hotel: { select: { logo: true, name: true } } },
  });
  if (!location) {
    return apiError("Location not found", 404, "NOT_FOUND");
  }

  const settings = await prisma.systemSetting.findMany({
    where: { hotelId: location.hotelId },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  const configStr = map.guest_page_config;
  let pageConfig = null;
  if (configStr) {
    try { pageConfig = JSON.parse(configStr); } catch { /* ignore bad JSON */ }
  }

  // Fallback hotel logo in config from DB if not in saved config
  if (pageConfig && !pageConfig.hotelLogo && location.hotel?.logo) {
    pageConfig.hotelLogo = location.hotel.logo;
  }
  if (pageConfig && !pageConfig.hotelName && location.hotel?.name) {
    pageConfig.hotelName = location.hotel.name;
  }

  return apiSuccess({
    guest_fields_name: map.guest_fields_name || "optional",
    guest_fields_room: map.guest_fields_room || "optional",
    guest_fields_phone: map.guest_fields_phone || "optional",
    pageConfig,
  });
}

export const GET = toRouteHandler(withRateLimit(
  "locationSettings",
  { limit: 60, window: 60 },
  (req: NextRequest, ctx) => handleGetLocationSettings(req, ctx),
));
