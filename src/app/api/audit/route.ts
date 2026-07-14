import { NextRequest } from "next/server";
import { ReportService } from "@/services/report-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const params = {
    action: url.searchParams.get("action") || undefined,
    entityType: url.searchParams.get("entityType") || undefined,
    userId: url.searchParams.get("userId") ? Number(url.searchParams.get("userId")) : undefined,
    dateFrom: url.searchParams.get("dateFrom") ? new Date(url.searchParams.get("dateFrom")!) : undefined,
    dateTo: url.searchParams.get("dateTo") ? new Date(url.searchParams.get("dateTo")!) : undefined,
    page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1,
    pageSize: url.searchParams.get("pageSize") ? Number(url.searchParams.get("pageSize")) : 50,
  };

  const result = await ReportService.getAuditLogs(ctx.user!.hotelId, params);
  return apiSuccess(result);
}));
