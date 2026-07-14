import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api-response";
import { hashToken } from "@/lib/utils";

// --- Context that flows through composed HOFs ---

export interface AuthUser {
  id: number;
  hotelId: number;
  username: string;
  role: "ADMIN" | "DRIVER";
  fullName: string;
  isActive: boolean;
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
export interface RequestContext {
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
) => Promise<Response | void> | Response | void;

// --- In-memory sliding-window rate limiter ---
// ponytail: replace with Redis when running multiple instances

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): boolean {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const entry = rateLimitStore.get(key) ?? { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= limit) {
    rateLimitStore.set(key, entry);
    return false;
  }

  entry.timestamps.push(now);
  rateLimitStore.set(key, entry);
  return true;
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

      const tokenHash = hashToken(token);
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              hotelId: true,
              username: true,
              role: true,
              fullName: true,
              isActive: true,
              hotel: { select: { isActive: true } },
            },
          },
        },
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        return apiError("Session expired or invalid", 401, "SESSION_EXPIRED");
      }
      if (!session.user.isActive) {
        return apiError("User account is inactive", 403, "USER_INACTIVE");
      }
      if (!session.user.hotel?.isActive) {
        return apiError("Hotel is inactive", 403, "HOTEL_INACTIVE");
      }
      if (options?.role && session.user.role !== options.role) {
        return apiError("Insufficient permissions", 403, "FORBIDDEN");
      }

      // Touch last activity; failure must not break the request.
      await prisma.session
        .update({
          where: { id: session.id },
          data: { lastActivity: new Date() },
        })
        .catch(() => {});

      const user: AuthUser = {
        id: session.user.id,
        hotelId: session.user.hotelId,
        username: session.user.username,
        role: session.user.role,
        fullName: session.user.fullName,
        isActive: session.user.isActive,
      };

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
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKey = `${key}:${ip}`;

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
  ...layers: Array<(h: InnerHandler) => InnerHandler>
): (handler: InnerHandler) => InnerHandler {
  return (handler) =>
    layers.reduceRight<InnerHandler>((acc, layer) => layer(acc), handler);
}
