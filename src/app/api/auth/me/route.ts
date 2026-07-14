import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { AuthService } from "@/services/auth-service";

export const GET = toRouteHandler(withAuth(async (_req, ctx) => {
  try {
    const user = await AuthService.getMe(ctx.user!.id);
    return apiSuccess({ user });
  } catch (err) {
    return apiError(
      err instanceof Error ? err.message : "Failed to get user",
      500,
      "AUTH_ME_FAILED",
    );
  }
}));
