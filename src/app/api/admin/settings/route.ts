import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";

const updateSettingsSchema = z.object({
  demo_mode: z.enum(["true", "false"]).optional(),
  guest_fields_name: z.enum(["required", "optional", "off"]).optional(),
  guest_fields_room: z.enum(["required", "optional", "off"]).optional(),
  guest_fields_phone: z.enum(["required", "optional", "off"]).optional(),
  guest_page_config: z.string().optional(),
  monitor_enabled: z.enum(["true", "false"]).optional(),
  gps_tracking: z.enum(["true", "false"]).optional(),
  hotel_name: z.string().min(1).max(255).optional(),
  hotel_phone: z.string().max(50).optional(),
  hotel_email: z.string().email().max(255).optional(),
  hotel_address: z.string().max(500).optional(),
});

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const settings = await prisma.systemSetting.findMany({
    where: { hotelId: ctx.user!.hotelId },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  // Defaults
  if (!("demo_mode" in map)) map.demo_mode = "true";
  if (!("guest_fields_name" in map)) map.guest_fields_name = "optional";
  if (!("guest_fields_room" in map)) map.guest_fields_room = "optional";
  if (!("guest_fields_phone" in map)) map.guest_fields_phone = "optional";
  if (!("monitor_enabled" in map)) map.monitor_enabled = "true";
  if (!("gps_tracking" in map)) map.gps_tracking = "true";

  // Also include hotel profile + logo + map from Hotel table
  const hotel = await prisma.hotel.findUnique({
    where: { id: ctx.user!.hotelId },
    select: { name: true, phone: true, email: true, address: true, logo: true },
  });
  if (hotel) {
    map.hotel_name = hotel.name || "";
    map.hotel_phone = hotel.phone || "";
    map.hotel_email = hotel.email || "";
    map.hotel_address = hotel.address || "";
    map.hotel_logo = hotel.logo || "";
  }

  return apiSuccess(map);
}, { role: "ADMIN" }));

export const PUT = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const result = updateSettingsSchema.safeParse(body);

  if (!result.success) {
    return apiError("Invalid settings data", 400, "VALIDATION_ERROR");
  }

  const data = result.data;

  // Upsert each setting that was provided
  const fields: Array<{ key: string; value: string }> = [];
  if (data.demo_mode !== undefined) fields.push({ key: "demo_mode", value: data.demo_mode });
  if (data.guest_fields_name !== undefined) fields.push({ key: "guest_fields_name", value: data.guest_fields_name });
  if (data.guest_fields_room !== undefined) fields.push({ key: "guest_fields_room", value: data.guest_fields_room });
  if (data.guest_fields_phone !== undefined) fields.push({ key: "guest_fields_phone", value: data.guest_fields_phone });
  if (data.guest_page_config !== undefined) fields.push({ key: "guest_page_config", value: data.guest_page_config });
  if (data.monitor_enabled !== undefined) fields.push({ key: "monitor_enabled", value: data.monitor_enabled });
  if (data.gps_tracking !== undefined) fields.push({ key: "gps_tracking", value: data.gps_tracking });
  if (data.hotel_name !== undefined) fields.push({ key: "hotel_name", value: data.hotel_name });
  if (data.hotel_phone !== undefined) fields.push({ key: "hotel_phone", value: data.hotel_phone });
  if (data.hotel_email !== undefined) fields.push({ key: "hotel_email", value: data.hotel_email });
  if (data.hotel_address !== undefined) fields.push({ key: "hotel_address", value: data.hotel_address });

  // Update Hotel table for hotel profile fields
  const hotelUpdates: Record<string, string> = {};
  if (data.hotel_name !== undefined) hotelUpdates.name = data.hotel_name;
  if (data.hotel_phone !== undefined) hotelUpdates.phone = data.hotel_phone;
  if (data.hotel_email !== undefined) hotelUpdates.email = data.hotel_email;
  if (data.hotel_address !== undefined) hotelUpdates.address = data.hotel_address;
  if (Object.keys(hotelUpdates).length > 0) {
    await prisma.hotel.update({
      where: { id: ctx.user!.hotelId },
      data: hotelUpdates,
    });
  }

  for (const f of fields) {
    await prisma.systemSetting.upsert({
      where: { hotelId_key: { hotelId: ctx.user!.hotelId, key: f.key } },
      update: { value: f.value },
      create: { hotelId: ctx.user!.hotelId, key: f.key, value: f.value },
    });
  }

  // Demo mod kapatılınca tüm sürücülere şifre değiştirme zorunluluğu ekle
  if (data.demo_mode === "false") {
    await prisma.user.updateMany({
      where: { hotelId: ctx.user!.hotelId, role: "DRIVER", isActive: true },
      data: { mustChangePassword: true },
    });
  }

  await logAudit({
    hotelId: ctx.user!.hotelId,
    userId: ctx.user!.id,
    action: "UPDATE_SETTINGS",
    entityType: "SystemSetting",
    newValues: data,
  });

  // Return updated settings
  const settings = await prisma.systemSetting.findMany({
    where: { hotelId: ctx.user!.hotelId },
    select: { key: true, value: true },
  });

  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  if (!("demo_mode" in map)) map.demo_mode = "true";
  if (!("monitor_enabled" in map)) map.monitor_enabled = "true";
  if (!("gps_tracking" in map)) map.gps_tracking = "true";

  return apiSuccess(map);
}, { role: "ADMIN" }));
