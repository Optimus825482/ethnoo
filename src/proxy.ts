import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public assets always pass through
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // Setup check — redirect root and login to /setup if needed
  if (pathname === "/" || pathname === "/login") {
    try {
      const baseUrl = process.env.NEXTAUTH_URL!;
      const sRes = await fetch(`${baseUrl}/api/setup`, { cache: "no-store" });
      const sJson = await sRes.json();
      if (sJson.success && sJson.data.setupRequired) {
        return NextResponse.redirect(new URL("/setup", req.url));
      }
    } catch {
      // ignore
    }
    if (pathname === "/login") return NextResponse.next();
    // Root — redirect to login if no session
    const sessionToken = req.cookies.get("session_token")?.value;
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    return NextResponse.next();
  }

  // Public paths
  const publicPaths = [
    "/setup",
    "/api/setup",
    "/logout",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/health",
    "/guest/call",
    "/api/requests",
    "/api/sse/guest",
    "/api/locations",
    "/manifest.json",
    "/manifest.webmanifest",
    "/icons",
    "/images",
    "/sounds",
    "/fonts",
    "/webfonts",
    "/flags",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Guest status page is public
  if (pathname.match(/^\/guest\/status\/\d+$/)) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get("session_token")?.value;

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
