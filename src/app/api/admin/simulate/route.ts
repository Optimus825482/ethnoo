import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { RequestService } from "@/services/request-service";
import { logAudit } from "@/lib/audit";

const simulateSchema = z.object({
  locationId: z.number().int().positive(),
});

// GET — check demo mode + list locations
export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const demoMode = await prisma.systemSetting.findUnique({
    where: { hotelId_key: { hotelId: ctx.user!.hotelId, key: "demo_mode" } },
    select: { value: true },
  });

  // Default to true when not set (matches settings API default)
  const isDemo = demoMode?.value !== "false";

  const locations = isDemo
    ? await prisma.location.findMany({
        where: { hotelId: ctx.user!.hotelId, isActive: true },
        select: { id: true, name: true, description: true, logo: true, displayOrder: true },
        orderBy: { displayOrder: "asc" },
      })
    : [];

  // Son 5 simülasyon talebi
  const recent = await prisma.buggyRequest.findMany({
    where: {
      hotelId: ctx.user!.hotelId,
      notes: { contains: "[SIMÜLASYON]" },
    },
    select: {
      id: true,
      status: true,
      location: { select: { name: true } },
      guestName: true,
      requestedAt: true,
    },
    orderBy: { requestedAt: "desc" },
    take: 5,
  });

  return apiSuccess({ demoMode: isDemo, locations, recent });
}, { role: "ADMIN" }));

// POST — create simulated request
export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const demoMode = await prisma.systemSetting.findUnique({
    where: { hotelId_key: { hotelId: ctx.user!.hotelId, key: "demo_mode" } },
    select: { value: true },
  });

  if (demoMode?.value !== "true") {
    return apiError("Simülasyon sadece Demo Mod aktifken kullanılabilir", 403, "DEMO_MODE_REQUIRED");
  }

  const body = await req.json();
  const result = simulateSchema.safeParse(body);
  if (!result.success) {
    return apiError("Geçersiz lokasyon", 400, "VALIDATION_ERROR");
  }

  const { locationId } = result.data;

  // Lokasyonu kontrol et
  const location = await prisma.location.findFirst({
    where: { id: locationId, hotelId: ctx.user!.hotelId, isActive: true },
    select: { id: true, name: true },
  });
  if (!location) {
    return apiError("Lokasyon bulunamadı", 404, "LOCATION_NOT_FOUND");
  }

  // Sahte misafir adları
  const guestNames = [
    "Demo Misafir 🧑"
  ];
  const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
  const roomNumber = `D${String(Math.floor(Math.random() * 999) + 1).padStart(3, "0")}`;
  const ipAddress = req.headers.get("x-forwarded-for") || "simulate";

  const request = await RequestService.create(
    ctx.user!.hotelId,
    {
      locationId,
      guestName,
      roomNumber,
      hasRoom: true,
      phone: "+90 555 000 00 00",
      notes: `[SIMÜLASYON] Admin tarafından oluşturulan demo talep. Lokasyon: ${location.name}`,
    },
    ipAddress,
  );

  await logAudit({
    hotelId: ctx.user!.hotelId,
    userId: ctx.user!.id,
    action: "SIMULATE_REQUEST",
    entityType: "BuggyRequest",
    entityId: request.id,
    ipAddress,
    newValues: { locationId, guestName, roomNumber, simulated: true },
  });

  return apiSuccess({ ...request }, 201);
}, { role: "ADMIN" }));
