import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
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

// GET /api/auth/logout — also handle for direct navigation (no auth required)
export async function GET(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (token) {
    try {
      const { validateSession } = await import("@/lib/auth");
      const validated = await validateSession(token, { allowInactive: true });
      if (validated) {
        const authCtx: AuthContext = { user: validated.user, session: { id: validated.session.id, tokenHash: validated.session.tokenHash, expiresAt: validated.session.expiresAt } };
        await AuthService.logout(authCtx);
      }
    } catch { /* session may already be invalid */ }
  }
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}
