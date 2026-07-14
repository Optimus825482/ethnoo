import { NextRequest } from "next/server";
import { z } from "zod";
import { completeRequestSchema } from "@/schemas/request";
import { RequestService } from "@/services/request-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, withValidation, withRateLimit, toRouteHandler } from "@/lib/middleware";

export const POST = toRouteHandler(withRateLimit(
  "complete-request",
  { limit: 20, window: 60 },
  withAuth((req: NextRequest, ctx) =>
    withValidation(completeRequestSchema, async (_r, vctx) => {
      const data = vctx.data as z.infer<typeof completeRequestSchema>;
      try {
        const request = await RequestService.complete(
          ctx.user!.hotelId,
          Number(ctx.params!.id),
          ctx.user!.id,
          data.completionLocationId,
        );
        return apiSuccess(request);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 500;
        return apiError(err instanceof Error ? err.message : "Failed", status);
      }
    })(req, ctx),
  ),
));
