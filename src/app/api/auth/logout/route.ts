import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/auth-service";
import { clearSessionCookie } from "@/lib/auth";
import type { AuthContext } from "@/types";

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
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
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
  const res = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(res);
  return res;
}
