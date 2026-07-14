import { NextRequest } from "next/server";
import { RequestService } from "@/services/request-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, withRateLimit, toRouteHandler } from "@/lib/middleware";

export const POST = toRouteHandler(withRateLimit(
  "accept-request",
  { limit: 20, window: 60 },
  withAuth(async (_req: NextRequest, ctx) => {
    try {
      const request = await RequestService.accept(
        ctx.user!.hotelId,
        Number(ctx.params!.id),
        ctx.user!.id,
      );
      return apiSuccess(request);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 500;
      return apiError(err instanceof Error ? err.message : "Failed", status);
    }
  }),
));
