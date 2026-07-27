import { NextRequest } from "next/server";
import { MonitorService } from "@/services/monitor-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const state = await MonitorService.getState(ctx.user!.hotelId);
  return apiSuccess(state);
}, { role: "ADMIN" }));
