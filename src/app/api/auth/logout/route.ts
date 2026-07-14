import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { clearSessionCookie } from "@/lib/auth";
import type { AuthContext } from "@/types";

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const ipAddress = req.headers.get("x-forwarded-for") || undefined;
  const authCtx: AuthContext = { user: ctx.user!, session: ctx.session! };
  await AuthService.logout(authCtx, ipAddress);
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}));

// GET /api/auth/logout — also handle for direct navigation
export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const ipAddress = req.headers.get("x-forwarded-for") || undefined;
  const authCtx: AuthContext = { user: ctx.user!, session: ctx.session! };
  await AuthService.logout(authCtx, ipAddress);
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}));
