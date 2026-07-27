import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const locationId = parseInt(id, 10);
  if (isNaN(locationId)) {
    return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "Invalid location ID" } }, { status: 400 });
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { hotelId: true, hotel: { select: { logo: true, name: true } } },
  });
  if (!location) {
    return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Location not found" } }, { status: 404 });
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

  return NextResponse.json({ success: true, data: {
    guest_fields_name: map.guest_fields_name || "optional",
    guest_fields_room: map.guest_fields_room || "optional",
    guest_fields_phone: map.guest_fields_phone || "optional",
    pageConfig,
  }});
}
