// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import {
  toRouteHandler,
  withRateLimit,
  withValidation,
  compose,
} from "@/lib/middleware";
import { z } from "zod";

// --- toRouteHandler ---

describe("toRouteHandler", () => {
  it("converts InnerHandler to NextRouteHandler and resolves params from promise", async () => {
    const innerHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true }),
    );

    const routeHandler = toRouteHandler(innerHandler);
    const request = new NextRequest(new Request("http://localhost/test"));
    const response = await routeHandler(request, {
      params: Promise.resolve({ id: "42" }),
    });

    expect(innerHandler).toHaveBeenCalledOnce();
    // ctx should have params resolved
    const ctx = innerHandler.mock.calls[0][1];
    expect(ctx.params).toEqual({ id: "42" });
    expect(response.status).toBe(200);
  });

  it("handles undefined nextContext", async () => {
    const innerHandler = vi.fn().mockResolvedValue(
      NextResponse.json({ ok: true }),
    );

    const routeHandler = toRouteHandler(innerHandler);
    const request = new NextRequest(new Request("http://localhost/test"));

    // Simulate Next.js calling without context (dynamic route without params)
    const response = await routeHandler(request, {
      params: undefined as unknown as Promise<Record<string, string | string[]>>,
    });

    expect(innerHandler).toHaveBeenCalledOnce();
    const ctx = innerHandler.mock.calls[0][1];
    expect(ctx.params).toBeUndefined();
    expect(response.status).toBe(200);
  });
});

// --- withRateLimit ---

describe("withRateLimit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests within limit", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit("test", { limit: 3, window: 60 }, handler);

    for (let i = 0; i < 3; i++) {
      const request = new NextRequest(
        new Request("http://localhost/test", {
          headers: { "x-forwarded-for": "10.0.0.1" },
        }),
      );
      const response = await wrapped(request, {});
      expect(response.status).toBe(200);
    }
  });

  it("blocks requests exceeding limit", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit("test-block", { limit: 2, window: 60 }, handler);

    // First two requests succeed
    for (let i = 0; i < 2; i++) {
      const request = new NextRequest(
        new Request("http://localhost/test", {
          headers: { "x-forwarded-for": "10.0.0.2" },
        }),
      );
      const response = await wrapped(request, {});
      expect(response.status).toBe(200);
    }

    // Third request should be rate-limited
    const request = new NextRequest(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "10.0.0.2" },
      }),
    );
    const response = await wrapped(request, {});
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: "RATE_LIMITED" },
    });
  });

  it("has separate counters per IP", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withRateLimit("test-ip", { limit: 1, window: 60 }, handler);

    // First request from IP A
    const reqA1 = new NextRequest(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "10.0.0.3" },
      }),
    );
    expect((await wrapped(reqA1, {})).status).toBe(200);

    // First request from IP B (should still work)
    const reqB1 = new NextRequest(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "10.0.0.4" },
      }),
    );
    expect((await wrapped(reqB1, {})).status).toBe(200);

    // Second request from IP A (should be blocked)
    const reqA2 = new NextRequest(
      new Request("http://localhost/test", {
        headers: { "x-forwarded-for": "10.0.0.3" },
      }),
    );
    expect((await wrapped(reqA2, {})).status).toBe(429);
  });
});

// --- withValidation ---

describe("withValidation", () => {
  const testSchema = z.object({
    name: z.string().min(1, "Name required"),
    age: z.number().int().positive(),
  });

  it("passes validated data to handler", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
    const wrapped = withValidation(testSchema, handler);

    const request = new NextRequest(
      new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ name: "John", age: 30 }),
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await wrapped(request, {});
    expect(response.status).toBe(200);

    // Handler got ctx.data populated
    const ctx = handler.mock.calls[0][1];
    expect(ctx.data).toEqual({ name: "John", age: 30 });
  });

  it("returns 400 on invalid body", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(testSchema, handler);

    const request = new NextRequest(
      new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await wrapped(request, {});
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed JSON", async () => {
    const handler = vi.fn();
    const wrapped = withValidation(testSchema, handler);

    const request = new NextRequest(
      new Request("http://localhost/test", {
        method: "POST",
        body: "not-json",
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await wrapped(request, {});
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: "INVALID_BODY" },
    });
    expect(handler).not.toHaveBeenCalled();
  });
});

// --- compose ---

describe("compose", () => {
  it("composes layers right-to-left", async () => {
    const log: number[] = [];

    const layerA =
      (h: (req: NextRequest, ctx: Record<string, unknown>) => Promise<NextResponse>) =>
      async (req: NextRequest, ctx: Record<string, unknown>) => {
        log.push(1);
        return h(req, ctx);
      };

    const layerB =
      (h: (req: NextRequest, ctx: Record<string, unknown>) => Promise<NextResponse>) =>
      async (req: NextRequest, ctx: Record<string, unknown>) => {
        log.push(2);
        return h(req, ctx);
      };

    const handler = async () => {
      log.push(3);
      return NextResponse.json({ ok: true });
    };

    const composed = compose(layerA, layerB)(handler);

    const request = new NextRequest(new Request("http://localhost/test"));
    await composed(request, {});

    // layerA wraps -> calls layerB -> calls handler
    // So execution: layerA (pushed 1) -> layerB (pushed 2) -> handler (pushed 3)
    expect(log).toEqual([1, 2, 3]);
  });

  it("compose with withValidation and withRateLimit works together", async () => {
    const schema = z.object({ ok: z.literal(true) });
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));

    const wrapped = compose(
      (h) => withRateLimit("compose-test", { limit: 10, window: 60 }, h),
      (h) => withValidation(schema, h),
    )(handler);

    const request = new NextRequest(
      new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ ok: true }),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "10.0.0.99",
        },
      }),
    );

    const response = await wrapped(request, {});
    expect(response.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });
});
