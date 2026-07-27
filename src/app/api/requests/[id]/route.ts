import { NextRequest } from "next/server";
import { RequestService } from "@/services/request-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withRateLimit, toRouteHandler } from "@/lib/middleware";

// Public GET — guest fetches own request status (no auth, rate-limited)
export const GET = toRouteHandler(
  withRateLimit(
    "guest-status",
    { limit: 30, window: 60 },
    async (_req: NextRequest, ctx) => {
      try {
        const id = Number(ctx.params!.id);
        const request = await RequestService.getByIdPublic(id, _req.headers.get("x-guest-capability"));
        return apiSuccess(request);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 500;
        return apiError(err instanceof Error ? err.message : "Failed", status);
      }
    },
  ),
);
