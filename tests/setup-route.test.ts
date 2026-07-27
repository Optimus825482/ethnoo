import { beforeEach, describe, expect, it, vi } from "vitest";

const { hotelCount, userCount } = vi.hoisted(() => ({
  hotelCount: vi.fn(),
  userCount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { hotel: { count: hotelCount }, user: { count: userCount } },
}));
vi.mock("@/env", () => ({ env: { SETUP_SECRET: "correct-secret" } }));
vi.mock("@/lib/middleware", () => ({
  withRateLimit: vi.fn(),
  toRouteHandler: vi.fn(),
}));

import { GET } from "@/app/api/setup/route";

beforeEach(() => vi.clearAllMocks());

describe("GET /api/setup", () => {
  it.each([undefined, "wrong-secret"])("rejects %s secret without reading setup state", async (secret) => {
    const headers = new Headers();
    if (secret) headers.set("x-setup-secret", secret);

    const response = await GET(new Request("http://localhost/api/setup", { headers }) as never);

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ success: false, error: { code: "INVALID_SETUP_SECRET" } });
    expect(hotelCount).not.toHaveBeenCalled();
    expect(userCount).not.toHaveBeenCalled();
  });

  it("returns counts and state for the setup secret", async () => {
    hotelCount.mockResolvedValue(0);
    userCount.mockResolvedValue(0);

    const response = await GET(new Request("http://localhost/api/setup", {
      headers: { "x-setup-secret": "correct-secret" },
    }) as never);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { setupRequired: true, hotelCount: 0, userCount: 0 },
    });
  });
});
