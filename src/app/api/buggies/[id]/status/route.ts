import { NextRequest } from "next/server";
import { z } from "zod";
import { BuggyService } from "@/services/buggy-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

const statusSchema = z.object({
  status: z.enum(["AVAILABLE", "BUSY", "OFFLINE", "MAINTENANCE"]),
});

export const PATCH = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const result = statusSchema.safeParse(body);
    if (!result.success) {
      const err = result.error.issues[0];
      return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    const data = result.data;
    const buggy = await BuggyService.updateStatus(
      ctx.user!.hotelId,
      Number(ctx.params!.id),
      data.status,
      ctx.user!.id,
    );
    return apiSuccess(buggy);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return apiError(err instanceof Error ? err.message : "Failed", status);
  }
}));
