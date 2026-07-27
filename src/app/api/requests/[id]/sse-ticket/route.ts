import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { issueGuestSseTicket } from "@/lib/guest-capability";
import { toRouteHandler, withRateLimit } from "@/lib/middleware";

export const POST = toRouteHandler(withRateLimit(
  "guest-sse-ticket",
  { limit: 10, window: 60 },
  async (req: NextRequest, ctx) => {
    const result = await issueGuestSseTicket(Number(ctx.params!.id), req.headers.get("x-guest-capability"));
    return result ? apiSuccess(result, 201) : apiError("Request not found", 404, "REQUEST_NOT_FOUND");
  },
));
