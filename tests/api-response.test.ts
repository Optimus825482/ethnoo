import { describe, it, expect } from "vitest";
import { apiSuccess, apiError, ApiError } from "@/lib/api-response";

describe("ApiError", () => {
  it("creates error with status, message, and default code", () => {
    const err = new ApiError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.name).toBe("ApiError");
  });

  it("creates error with custom code", () => {
    const err = new ApiError(429, "Too fast", "RATE_LIMITED");
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("preserves stack trace", () => {
    const err = new ApiError(500, "Boom");
    expect(err.stack).toBeTruthy();
  });
});

describe("apiSuccess()", () => {
  it("returns NextResponse with success:true and data", async () => {
    const res = apiSuccess({ id: 1, name: "test" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({
      success: true,
      data: { id: 1, name: "test" },
    });
  });

  it("accepts custom status code", async () => {
    const res = apiSuccess(null, 201);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body).toEqual({ success: true, data: null });
  });

  it("handles array data", async () => {
    const res = apiSuccess([1, 2, 3]);
    const body = await res.json();
    expect(body).toEqual({ success: true, data: [1, 2, 3] });
  });
});

describe("apiError()", () => {
  it("returns NextResponse with error format", async () => {
    const res = apiError("Bad request", 400, "VALIDATION_ERROR");
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Bad request" },
    });
  });

  it("defaults status to 500 and code to INTERNAL_ERROR", async () => {
    const res = apiError("Something broke");
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Something broke" },
    });
  });
});
