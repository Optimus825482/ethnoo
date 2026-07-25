import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

const bodySchema = z.object({
  driverStatus: z.enum(["ON_DUTY", "OFF_DUTY"]),
});

export const PATCH = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || "Invalid body", 400, "VALIDATION_ERROR");
    }

    await prisma.user.update({
      where: { id: ctx.user!.id },
      data: {
        driverStatus: result.data.driverStatus,
        lastHeartbeat: new Date(),
      },
    });

    return apiSuccess({ driverStatus: result.data.driverStatus });
  } catch (err) {
    console.error("[driver/status]", err);
    return apiError("Failed", 500, "SERVER_ERROR");
  }
}));
