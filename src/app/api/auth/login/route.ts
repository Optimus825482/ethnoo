import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loginSchema } from "@/schemas/auth";
import { AuthService } from "@/services/auth-service";
import { apiSuccess, apiError, apiErrorHandler } from "@/lib/api-response";
import { withValidation, withRateLimit, toRouteHandler } from "@/lib/middleware";
import { setSessionCookie } from "@/lib/auth";

async function handleLogin(req: NextRequest, data: { username: string; password: string }) {
  const ipAddress = req.headers.get("x-forwarded-for") || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;

  const result = await AuthService.login(data.username, data.password, ipAddress, userAgent);

  const res = apiSuccess({
    user: result.user,
    mustChangePassword: result.user.mustChangePassword,
  });
  setSessionCookie(res, result.token);
  return res;
}

export const POST = toRouteHandler(withRateLimit(
  "login",
  { limit: 5, window: 60 },
  withValidation(loginSchema, (req, vctx) => {
    const data = vctx.data as z.infer<typeof loginSchema>;
    return handleLogin(req, data);
  }),
));
