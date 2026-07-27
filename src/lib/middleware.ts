import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api-response";
import { validateSession } from "@/lib/auth";

// --- Context that flows through composed HOFs ---

export interface AuthUser {
  id: number;
  hotelId: number;
  username: string;
  role: "ADMIN" | "DRIVER";
  fullName: string;
  isActive: boolean;
  driverStatus: "ON_DUTY" | "OFF_DUTY";
}

export interface AuthSession {
  id: number;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Accumulated context threaded through composed HOFs.
 *
 * When `withAuth` wraps a handler, `user`, `hotelId`, and `session`
 * are populated at the top level for ergonomic access:
 *   `ctx.user.hotelId`, `ctx.session.id`
 *
 * When `withValidation` wraps a handler, `data` is populated:
 *   `ctx.data` (typed via cast in the handler)
 *
 * Dynamic route `params` are resolved from Next.js context.
 */
export interface RequestContext extends Record<string, unknown> {
  /** Populated by withAuth. */
  user?: AuthUser;
  /** Convenience: same as user.hotelId. Populated by withAuth. */
  hotelId?: number;
  /** Populated by withAuth. */
  session?: AuthSession;
  /** Populated by withValidation. */
  data?: unknown;
  /** Resolved Next.js dynamic route params. */
  params?: Record<string, string | string[]>;
}

// --- Handler types ---

/**
 * Internal handler signature used between composed HOFs.
 * Receives the accumulated `RequestContext` as the second argument.
 */
export type InnerHandler = (
  req: NextRequest,
  ctx: RequestContext,
) => Promise<NextResponse> | NextResponse;

/**
 * Next.js App Router route handler signature.
 * This is what `export const GET = …` must satisfy.
 */
export type NextRouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> },
) => Promise<Response> | Response;

// --- In-memory sliding-window rate limiter ---
// ponytail: replace with Redis when running multiple instances

interface RateLimitEntry {
  timestamps: number[];
  expiresAt: number;
}

const MAX_RATE_LIMIT_KEYS = 10_000;
const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  for (const [storedKey, entry] of rateLimitStore) {
    if (entry.expiresAt <= now) rateLimitStore.delete(storedKey);
  }
  if (!rateLimitStore.has(key) && rateLimitStore.size >= MAX_RATE_LIMIT_KEYS) {
    rateLimitStore.delete(rateLimitStore.keys().next().value!);
  }

  const entry = rateLimitStore.get(key) ?? { timestamps: [], expiresAt: now + windowMs };
  entry.timestamps = entry.timestamps.filter((timestamp) => now - timestamp < windowMs);
  entry.expiresAt = now + windowMs;
  if (entry.timestamps.length >= limit) {
    rateLimitStore.set(key, entry);
    return false;
  }
  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return true;
}

function fallbackFingerprint(req: NextRequest): string {
  return `fallback:${createHash("sha256").update([
    req.headers.get("user-agent") ?? "",
    req.headers.get("accept-language") ?? "",
    req.headers.get("accept-encoding") ?? "",
  ].join("\0")).digest("hex")}`;
}

function getClientAddress(req: NextRequest): string {
  // One fixed trusted hop: use the address nearest controlled Traefik, never the leftmost claim.
  if (process.env.TRUST_PROXY === "true") {
    const chain = req.headers.get("x-forwarded-for")?.split(",").map((ip) => ip.trim()).filter(Boolean);
    if (chain?.length) return chain.at(-1)!;
  }
  return fallbackFingerprint(req);
}

// --- Internal helpers ---

/** Resolve Next.js params Promise into a plain object. */
async function resolveParams(
  nextContext?: { params: Promise<Record<string, string | string[]>> },
): Promise<Record<string, string | string[]> | undefined> {
  if (nextContext?.params) {
    return nextContext.params;
  }
  return undefined;
}

/**
 * Convert an `InnerHandler` into a `NextRouteHandler` suitable for
 * `export const GET = …`. Resolves the Next.js `params` Promise and
 * passes it as `ctx.params`.
 */
export function toRouteHandler(handler: InnerHandler): NextRouteHandler {
  return async (request, nextContext) => {
    const params = await resolveParams(nextContext);
    const ctx: RequestContext = { params };
    return handler(request, ctx);
  };
}

// --- withAuth ---

interface AuthOptions {
  role?: "ADMIN" | "DRIVER";
}

/**
 * Wraps an `InnerHandler` with session-based authentication.
 * Reads `session_token` cookie, validates against DB, and passes
 * `{ user, hotelId, session }` in the `RequestContext`.
 *
 * Returns an `InnerHandler` so it composes with other HOFs.
 * Use `toRouteHandler()` on the outermost result for the Next.js export.
 *
 * @example
 * // Standalone:
 * export const GET = toRouteHandler(withAuth(handler))
 *
 * // Composed:
 * export const POST = toRouteHandler(
 *   withRateLimit('login', {limit:5, window:60}, withValidation(schema, withAuth(handler)))
 * )
 */
export function withAuth(
  handler: InnerHandler,
  options?: AuthOptions,
): InnerHandler {
  return async (req, ctx) => {
    try {
      const token = req.cookies.get("session_token")?.value;
      if (!token) {
        return apiError("Authentication required", 401, "UNAUTHORIZED");
      }

      const validated = await validateSession(token, { allowInactive: true });
      if (!validated) {
        return apiError("Session expired or invalid", 401, "SESSION_EXPIRED");
      }
      const { session, user } = validated;
      if (!user.isActive) {
        return apiError("User account is inactive", 403, "USER_INACTIVE");
      }
      const hotel = await prisma.hotel.findUnique({
        where: { id: user.hotelId },
        select: { isActive: true },
      });
      if (!hotel?.isActive) {
        return apiError("Hotel is inactive", 403, "HOTEL_INACTIVE");
      }
      if (options?.role && user.role !== options.role) {
        return apiError("Insufficient permissions", 403, "FORBIDDEN");
      }

      // Touch last activity; failure must not break the request.
      await prisma.session
        .update({ where: { id: session.id }, data: { lastActivity: new Date() } })
        .catch(() => {});

      ctx.user = user;
      ctx.hotelId = user.hotelId;
      ctx.session = {
        id: session.id,
        tokenHash: session.tokenHash,
        expiresAt: session.expiresAt,
      };

      return handler(req, ctx);
    } catch (err) {
      console.error("[withAuth]", err);
      return apiError("Authentication failed", 500, "AUTH_ERROR");
    }
  };
}

// --- withValidation ---

/**
 * Wraps an `InnerHandler` with Zod body validation.
 * Parses JSON body, validates against schema, and passes
 * `{ data }` in the `RequestContext`.
 *
 * Returns an `InnerHandler` so it composes with other HOFs.
 *
 * @example
 * export const POST = toRouteHandler(withValidation(schema, handler))
 */
export function withValidation<T>(
  schema: z.ZodType<T>,
  handler: InnerHandler,
): InnerHandler {
  return async (req, ctx) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400, "INVALID_BODY");
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0];
      return apiError(
        firstError?.message || "Validation failed",
        400,
        "VALIDATION_ERROR",
      );
    }

    ctx.data = result.data;
    return handler(req, ctx);
  };
}

// --- withRateLimit ---

/**
 * Wraps an `InnerHandler` with in-memory sliding-window rate limiting.
 * Key is composed of the provided key + client IP.
 *
 * Returns an `InnerHandler` so it composes with other HOFs.
 *
 * @example
 * export const POST = toRouteHandler(
 *   withRateLimit('login', {limit:5, window:60}, withValidation(schema, withAuth(handler)))
 * )
 */
export function withRateLimit(
  key: string,
  options: { limit: number; window: number },
  handler: InnerHandler,
): InnerHandler {
  return async (req, ctx) => {
    const rateKey = `${key}:${getClientAddress(req)}`;

    if (!checkRateLimit(rateKey, options.limit, options.window)) {
      return apiError(
        "Too many requests. Please try again later.",
        429,
        "RATE_LIMITED",
      );
    }

    return handler(req, ctx);
  };
}

// --- Compose helper (optional ergonomic wrapper) ---

/**
 * Compose multiple HOF layers into a single wrapper.
 * Layers are applied right-to-left (innermost first), matching
 * the natural composition order:
 *
 *   compose(withRateLimit(k,o), withAuth, withValidation(s))(handler)
 *   // equivalent to:
 *   withRateLimit(k, o, withAuth(withValidation(s, handler)))
 */
export function compose(
  ...layers: Array<(h: never) => InnerHandler>
): (handler: InnerHandler) => InnerHandler {
  return (handler) =>
    layers.reduceRight<InnerHandler>((acc, layer) => layer(acc as never), handler);
}
