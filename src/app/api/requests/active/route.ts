import { NextRequest } from "next/server";
import { RequestService } from "@/services/request-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const requests = await RequestService.getActive(ctx.user!.hotelId);
  return apiSuccess(requests);
}));
