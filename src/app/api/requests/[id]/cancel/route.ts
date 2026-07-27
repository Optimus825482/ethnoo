import { NextRequest } from "next/server";
import { RequestService } from "@/services/request-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withRateLimit, toRouteHandler } from "@/lib/middleware";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/utils";

// POST /api/requests/[id]/cancel
// Authenticated (driver/admin) → service.cancel with hotelId/userId
// Unauthenticated (guest) → service.cancelByGuest
export const POST = toRouteHandler(
  withRateLimit(
    "cancel-request",
    { limit: 20, window: 60 },
    async (req: NextRequest, ctx) => {
      try {
        const id = Number(ctx.params!.id);
        const token = req.cookies.get("session_token")?.value;

        // No session → guest cancel
        if (!token) {
          const request = await RequestService.cancelByGuest(id, req.headers.get("x-guest-capability"));
          return apiSuccess(request);
        }

        // Has session → authenticate inline, then driver/admin cancel
        const tokenHash = hashToken(token);
        const session = await prisma.session.findUnique({
          where: { tokenHash },
          include: {
            user: {
              select: { id: true, hotelId: true, role: true, isActive: true, hotel: { select: { isActive: true } } },
            },
          },
        });

        if (!session || !session.isActive || session.expiresAt < new Date() || !session.user.isActive || !session.user.hotel?.isActive) {
          return apiError("Session expired or invalid", 401, "SESSION_EXPIRED");
        }

        const cancelledBy = session.user.role === "ADMIN" ? "ADMIN" : "DRIVER";
        const request = await RequestService.cancel(
          session.user.hotelId,
          id,
          cancelledBy,
          session.user.id,
        );
        return apiSuccess(request);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 500;
        return apiError(err instanceof Error ? err.message : "Failed", status);
      }
    },
  ),
);
