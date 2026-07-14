import { NextRequest } from "next/server";
import { ReportService } from "@/services/report-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return apiSuccess({ error: "dateFrom and dateTo required" }, 400);
  }

  const perf = await ReportService.getPerformance(
    ctx.user!.hotelId,
    new Date(dateFrom),
    new Date(dateTo),
  );
  return apiSuccess(perf);
}));
