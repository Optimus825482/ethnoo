import { NextRequest } from "next/server";
import { changePasswordSchema } from "@/schemas/auth";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, withRateLimit, toRouteHandler } from "@/lib/middleware";
import type { AuthContext } from "@/types";

export const POST = toRouteHandler(withRateLimit(
  "change-password",
  { limit: 3, window: 300 },
  withAuth(async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      const result = changePasswordSchema.safeParse(body);
      if (!result.success) {
        const err = result.error.issues[0];
        return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
      }
      const data = result.data;
      const authCtx: AuthContext = { user: ctx.user!, session: ctx.session! };
      await AuthService.changePassword(authCtx, data.currentPassword, data.newPassword);
      return apiSuccess({ message: "Password changed successfully" });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode || 500;
      return apiError(
        err instanceof Error ? err.message : "Failed to change password",
        status,
        "AUTH_CHANGE_PASSWORD_FAILED",
      );
    }
  }),
));
