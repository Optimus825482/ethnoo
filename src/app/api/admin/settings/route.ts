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

  return apiSuccess(map);
}, { role: "ADMIN" }));
