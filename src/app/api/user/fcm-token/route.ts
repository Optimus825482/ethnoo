import { NextRequest } from "next/server";
import { z } from "zod";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { saveFcmToken } from "@/services/notification-service";

const bodySchema = z.object({
  fcmToken: z.string().min(1),
  pushSubscription: z.string().optional(),
});

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = bodySchema.safeParse(body);
    if (!result.success) {
      return apiError(result.error.issues[0]?.message || "Invalid body", 400, "VALIDATION_ERROR");
    }
    await saveFcmToken(ctx.user!.id, result.data.fcmToken, result.data.pushSubscription);
    return apiSuccess({ saved: true });
  } catch (err) {
    console.error("[fcm-token]", err);
    return apiError("Failed to save token", 500, "SERVER_ERROR");
  }
}));

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const { prisma } = await import("@/lib/db");
  const user = await prisma.user.findUnique({
    where: { id: ctx.user!.id },
    select: { fcmToken: true, fcmTokenDate: true, pushSubscription: true },
  });
  return apiSuccess({
    fcmToken: user?.fcmToken || null,
    fcmTokenDate: user?.fcmTokenDate || null,
    hasPushSubscription: !!user?.pushSubscription,
  });
}));
