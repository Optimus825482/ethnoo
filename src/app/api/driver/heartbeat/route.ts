import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, withRateLimit, toRouteHandler } from "@/lib/middleware";

const bodySchema = z.object({
  driverStatus: z.enum(["ON_DUTY", "OFF_DUTY"]).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const POST = toRouteHandler(withAuth(withRateLimit(
  "heartbeat",
  { limit: 30, window: 60 },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const result = bodySchema.safeParse(body);
      if (!result.success) {
        return apiError(result.error.issues[0]?.message || "Invalid body", 400, "VALIDATION_ERROR");
      }

      const { driverStatus, latitude, longitude } = result.data;
      const hasGps = latitude != null && longitude != null;

      await prisma.user.update({
        where: { id: ctx.user!.id },
        data: {
          lastHeartbeat: new Date(),
          ...(driverStatus && { driverStatus }),
          ...(hasGps && { lastGpsLat: latitude, lastGpsLng: longitude, lastGpsAt: new Date() }),
        },
      });

      return apiSuccess({ ok: true, heartbeat: new Date().toISOString() });
    } catch (err) {
      console.error("[driver/heartbeat]", err);
      return apiError("Failed", 500, "SERVER_ERROR");
    }
  },
)));
