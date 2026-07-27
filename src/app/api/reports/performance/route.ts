import { NextRequest } from "next/server";
import { ReportService } from "@/services/report-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  // Default: last 30 days if no range
  const from = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = dateTo ? new Date(dateTo) : new Date();

  const perf = await ReportService.getPerformance(
    ctx.user!.hotelId,
    from,
    to,
  );
  return apiSuccess(perf);
}, { role: "ADMIN" }));
