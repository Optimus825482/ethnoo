import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { clearSessionCookie } from "@/lib/auth";
import type { AuthContext } from "@/types";

function redirectToLogin(req: NextRequest): NextResponse {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const res = NextResponse.redirect(new URL("/login", `${proto}://${host}`));
  clearSessionCookie(res);
  return res;
}

// POST /api/auth/logout — form-based logout (graceful, no auth gate)
export async function POST(req: NextRequest) {
  const token = req.cookies.get("session_token")?.value;
  if (token) {
    try {
      const { validateSession } = await import("@/lib/auth");
      const validated = await validateSession(token, { allowInactive: true });
      if (validated) {
        const authCtx: AuthContext = { user: validated.user, session: { id: validated.session.id, tokenHash: validated.session.tokenHash, expiresAt: validated.session.expiresAt } };
        await AuthService.logout(authCtx);
      }
    } catch { /* session may already be invalid — clear cookie anyway */ }
  }
  return redirectToLogin(req);
}

// GET /api/auth/logout — direct navigation (no auth required)
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
  return redirectToLogin(req);
}
