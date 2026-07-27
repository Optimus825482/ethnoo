import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

const bodySchema = z.object({
  locationId: z.number().int().positive(),
});

// POST /api/driver/location — set driver's current location on their assigned buggy
export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || "Invalid body", 400, "VALIDATION_ERROR");
    }

    const { locationId } = result.data;

    // Find driver's active buggy assignment
    const assignment = await prisma.buggyDriver.findFirst({
      where: { driverId: ctx.user!.id, isActive: true },
      include: { buggy: { select: { id: true, code: true, hotelId: true } } },
    });

    if (!assignment) {
      return apiError("Size atanmış bir araç bulunamadı", 404, "NO_BUGGY_ASSIGNED");
    }

    // Update buggy's current location
    await prisma.buggy.update({
      where: { id: assignment.buggy.id },
      data: { currentLocationId: locationId },
    });

    const { publishSSE } = await import("@/lib/event-bus");
    publishSSE(`hotel:${assignment.buggy.hotelId}`, {
      type: "buggy_location",
      buggyId: assignment.buggy.id,
      locationId,
    });

    // Get location name for response
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true },
    });

    return apiSuccess({
      buggyId: assignment.buggy.id,
      buggyCode: assignment.buggy.code,
      location,
    });
  } catch (err) {
    console.error("[driver/location]", err);
    return apiError("Konum güncellenemedi", 500, "SERVER_ERROR");
  }
}));

// GET /api/driver/location — get driver's current buggy and location
export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const assignment = await prisma.buggyDriver.findFirst({
      where: { driverId: ctx.user!.id, isActive: true },
      include: {
        buggy: {
          include: {
            currentLocation: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!assignment) {
      return apiSuccess({ driverStatus: ctx.user!.driverStatus, buggy: null });
    }

    return apiSuccess({
      driverStatus: ctx.user!.driverStatus,
      buggy: {
        id: assignment.buggy.id,
        code: assignment.buggy.code,
        icon: assignment.buggy.icon,
        status: assignment.buggy.status,
        currentLocation: assignment.buggy.currentLocation,
      },
    });
  } catch (err) {
    console.error("[driver/location]", err);
    return apiError("Failed", 500, "SERVER_ERROR");
  }
}));
