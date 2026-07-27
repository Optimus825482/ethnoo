import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { NextRouteHandler } from "@/lib/middleware";

const mocks = vi.hoisted(() => {
  const sideEffect = vi.fn();
  const model = new Proxy({}, { get: () => sideEffect });
  const findSession = vi.fn();
  const updateSession = vi.fn();
  const findSettings = vi.fn();
  return {
    findSession,
    updateSession,
    findSettings,
    sideEffect,
    prisma: new Proxy({
      session: { findUnique: findSession, update: updateSession },
      systemSetting: { findMany: findSettings },
    }, { get: (target, key) => Reflect.get(target, key) ?? model }),
  };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.sideEffect }));
vi.mock("@/lib/auth", () => ({ hashPassword: mocks.sideEffect }));
vi.mock("@/lib/event-bus", () => ({ eventBus: { subscribe: mocks.sideEffect } }));
vi.mock("@/services/buggy-service", () => ({ BuggyService: new Proxy({}, { get: () => mocks.sideEffect }) }));
vi.mock("@/services/location-service", () => ({ LocationService: new Proxy({}, { get: () => mocks.sideEffect }) }));
vi.mock("@/services/monitor-service", () => ({ MonitorService: new Proxy({}, { get: () => mocks.sideEffect }) }));
vi.mock("@/services/report-service", () => ({ ReportService: new Proxy({}, { get: () => mocks.sideEffect }) }));
vi.mock("@/services/request-service", () => ({ RequestService: new Proxy({}, { get: () => mocks.sideEffect }) }));

import * as settings from "@/app/api/admin/settings/route";
import * as simulate from "@/app/api/admin/simulate/route";
import * as users from "@/app/api/admin/users/route";
import * as user from "@/app/api/admin/users/[id]/route";
import * as audit from "@/app/api/audit/route";
import * as monitor from "@/app/api/monitor/state/route";
import * as summary from "@/app/api/reports/summary/route";
import * as performance from "@/app/api/reports/performance/route";
import * as adminSse from "@/app/api/sse/admin/route";
import * as buggies from "@/app/api/buggies/route";
import * as buggy from "@/app/api/buggies/[id]/route";
import * as buggyDrivers from "@/app/api/buggies/[id]/drivers/route";
import * as buggyStatus from "@/app/api/buggies/[id]/status/route";
import * as locations from "@/app/api/locations/route";
import * as location from "@/app/api/locations/[id]/route";
import * as locationLogo from "@/app/api/locations/[id]/logo/route";
import * as locationQr from "@/app/api/locations/[id]/qr/route";

type Case = { method: string; path: string; handler: NextRouteHandler };

const privileged: Case[] = [
  { method: "GET", path: "/api/admin/settings", handler: settings.GET },
  { method: "PUT", path: "/api/admin/settings", handler: settings.PUT },
  { method: "GET", path: "/api/admin/simulate", handler: simulate.GET },
  { method: "POST", path: "/api/admin/simulate", handler: simulate.POST },
  { method: "GET", path: "/api/admin/users", handler: users.GET },
  { method: "POST", path: "/api/admin/users", handler: users.POST },
  { method: "GET", path: "/api/admin/users/1", handler: user.GET },
  { method: "PUT", path: "/api/admin/users/1", handler: user.PUT },
  { method: "DELETE", path: "/api/admin/users/1", handler: user.DELETE },
  { method: "GET", path: "/api/audit", handler: audit.GET },
  { method: "GET", path: "/api/monitor/state", handler: monitor.GET },
  { method: "GET", path: "/api/reports/summary", handler: summary.GET },
  { method: "GET", path: "/api/reports/performance", handler: performance.GET },
  { method: "GET", path: "/api/sse/admin", handler: adminSse.GET },
  { method: "POST", path: "/api/buggies", handler: buggies.POST },
  { method: "PUT", path: "/api/buggies/1", handler: buggy.PUT },
  { method: "DELETE", path: "/api/buggies/1", handler: buggy.DELETE },
  { method: "POST", path: "/api/buggies/1/drivers", handler: buggyDrivers.POST },
  { method: "DELETE", path: "/api/buggies/1/drivers?driverId=1", handler: buggyDrivers.DELETE },
  { method: "PATCH", path: "/api/buggies/1/status", handler: buggyStatus.PATCH },
  { method: "POST", path: "/api/locations", handler: locations.POST },
  { method: "PUT", path: "/api/locations/1", handler: location.PUT },
  { method: "DELETE", path: "/api/locations/1", handler: location.DELETE },
  { method: "POST", path: "/api/locations/1/logo", handler: locationLogo.POST },
  { method: "DELETE", path: "/api/locations/1/logo", handler: locationLogo.DELETE },
  { method: "POST", path: "/api/locations/1/qr", handler: locationQr.POST },
];

const session = (role: "ADMIN" | "DRIVER", hotelId = 41) => ({
  id: 1,
  tokenHash: "hash",
  expiresAt: new Date(Date.now() + 60_000),
  isActive: true,
  user: { id: 1, hotelId, username: role.toLowerCase(), role, fullName: role, isActive: true, hotel: { isActive: true } },
});

const call = async ({ method, path, handler }: Case, token?: string) => {
  const headers = new Headers({ "x-forwarded-for": `${method}-${path}-${token ?? "anonymous"}` });
  if (token) headers.set("cookie", `session_token=${token}`);
  const request = new NextRequest(`http://localhost${path}`, { method, headers });
  return (await handler(request, { params: Promise.resolve({ id: "1" }) }))!;
};

describe.each(privileged)("$method $path authorization", (endpoint) => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without a session before handler side effects", async () => {
    expect((await call(endpoint)).status).toBe(401);
    expect(mocks.sideEffect).not.toHaveBeenCalled();
  });

  it("returns 403 for DRIVER before handler side effects", async () => {
    mocks.findSession.mockResolvedValue(session("DRIVER"));
    expect((await call(endpoint, "driver")).status).toBe(403);
    expect(mocks.sideEffect).not.toHaveBeenCalled();
    expect(mocks.updateSession).not.toHaveBeenCalled();
  });
});

describe("tenant-scoped ADMIN authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSession.mockResolvedValue({});
  });

  it("passes the authenticated hotelId to a representative handler", async () => {
    mocks.findSession.mockResolvedValue(session("ADMIN", 41));
    mocks.findSettings.mockResolvedValue([]);

    expect((await call(privileged[0], "admin")).status).toBe(200);
    expect(mocks.findSettings).toHaveBeenCalledWith(expect.objectContaining({
      where: { hotelId: 41 },
    }));
  });
});
