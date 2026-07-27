import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionUpdate: vi.fn(),
  settingFindUnique: vi.fn(),
  queryRaw: vi.fn(),
  updateMany: vi.fn(),
  auditCreate: vi.fn(),
  buggyUpdate: vi.fn(),
  buggyUpdateMany: vi.fn(),
  buggyDriverFindFirst: vi.fn(),
  txRequestFindUnique: vi.fn(),
  txRequestFindFirst: vi.fn(),
  txLocationFindFirst: vi.fn(),
  logAudit: vi.fn(),
  publishSSE: vi.fn(),
  sendToDrivers: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    location: { findFirst: mocks.findFirst, findUnique: mocks.findUnique },
    buggyRequest: { findFirst: mocks.findFirst, findUnique: mocks.findUnique, findMany: mocks.findMany, count: mocks.count, create: mocks.create, update: mocks.update, updateMany: mocks.updateMany },
    buggy: { update: mocks.buggyUpdate },
    auditTrail: { create: mocks.auditCreate },
    session: { findUnique: mocks.sessionFindUnique, update: mocks.sessionUpdate },
    systemSetting: { findUnique: mocks.settingFindUnique },
    $transaction: vi.fn((callback) => callback({
      $queryRaw: mocks.queryRaw,
      buggyRequest: { update: mocks.update, findUnique: mocks.txRequestFindUnique, findFirst: mocks.txRequestFindFirst },
      buggyDriver: { findFirst: mocks.buggyDriverFindFirst },
      location: { findFirst: mocks.txLocationFindFirst },
      buggy: { update: mocks.buggyUpdate, updateMany: mocks.buggyUpdateMany },
      auditTrail: { create: mocks.auditCreate },
    })),
  },
}));
vi.mock("@/lib/audit", () => ({ logAudit: mocks.logAudit }));
vi.mock("@/lib/event-bus", () => ({ publishSSE: mocks.publishSSE, eventBus: { subscribe: vi.fn(() => vi.fn()) } }));
vi.mock("@/services/notification-service", () => ({ sendToDrivers: mocks.sendToDrivers }));
vi.mock("@/lib/middleware", async (load) => {
  const actual = await load<typeof import("@/lib/middleware")>();
  return { ...actual, withRateLimit: (_key: string, _options: unknown, handler: unknown) => handler };
});

import { hashGuestCapability } from "@/lib/guest-capability";
import { RequestService } from "@/services/request-service";
import { POST as createRequest } from "@/app/api/requests/route";
import { GET as status } from "@/app/api/requests/[id]/route";
import { POST as cancel } from "@/app/api/requests/[id]/cancel/route";
import { POST as issueTicket } from "@/app/api/requests/[id]/sse-ticket/route";
import { GET as stream } from "@/app/api/sse/guest/[requestId]/route";
import { POST as simulate } from "@/app/api/admin/simulate/route";

const token = "a".repeat(43);
const hash = hashGuestCapability(token);
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const streamParams = (requestId: string) => ({ params: Promise.resolve({ requestId }) });
const request = (url: string, init?: RequestInit) => new NextRequest(new Request(url, init));
const responseOf = async (response: Response | void) => response as Response;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.buggyUpdateMany.mockResolvedValue({ count: 1 });
});

describe("guest capability", () => {
  it("uses explicit safe selects for authenticated detail, list, and active responses", async () => {
    mocks.findFirst.mockResolvedValue({ id: 42 });
    mocks.findMany.mockResolvedValue([]);
    mocks.count.mockResolvedValue(0);
    await RequestService.getById(1, 42);
    await RequestService.list(1);
    await RequestService.getActive(1);

    const queries = [mocks.findFirst.mock.calls[0][0], mocks.findMany.mock.calls[0][0], mocks.findMany.mock.calls[1][0]];
    for (const query of queries) {
      expect(query).toHaveProperty("select");
      expect(query).not.toHaveProperty("include");
      for (const field of ["guestCapabilityHash", "guestSseTicketHash", "guestSseTicketExpiresAt", "guestSseTicketUsedAt", "guestFcmToken", "guestFcmTokenExpiresAt", "guestPushSubscription"]) {
        expect(query.select).not.toHaveProperty(field);
      }
    }
  });

  it("removes capability from admin simulate response", async () => {
    mocks.sessionFindUnique.mockResolvedValue({
      id: 1,
      isActive: true,
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 3, hotelId: 1, role: "ADMIN", isActive: true, hotel: { isActive: true } },
    });
    mocks.sessionUpdate.mockResolvedValue({});
    mocks.settingFindUnique.mockResolvedValue({ value: "true" });
    mocks.findFirst.mockResolvedValue({ id: 7, name: "Lobby" });
    mocks.create.mockImplementation(({ data, select }) => Promise.resolve(Object.fromEntries(Object.keys(select).map((key) => [key, key === "id" ? 42 : key === "location" ? { id: 7 } : data[key]]))));

    const response = await responseOf(await simulate(request("http://localhost/api/admin/simulate", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "session_token=valid" },
      body: JSON.stringify({ locationId: 7 }),
    }), { params: Promise.resolve({}) }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).not.toHaveProperty("guestCapability");
  });

  it("returns the raw capability once from POST /api/requests and never exposes internal hashes", async () => {
    mocks.findUnique.mockResolvedValue({ hotelId: 1 });
    mocks.findFirst.mockResolvedValue({ id: 7, name: "Lobby" });
    mocks.create.mockImplementation(({ data, select }) => Promise.resolve(Object.fromEntries(Object.keys(select).map((key) => [key, key === "id" ? 42 : key === "location" ? { id: 7 } : data[key]]))));

    const response = await responseOf(await createRequest(request("http://localhost/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locationId: 7 }),
    }), { params: Promise.resolve({}) }));
    const body = await response.json();
    const result = body.data;

    expect(response.status).toBe(201);
    expect(result.guestCapability).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(JSON.stringify(result).match(/guestCapability/g)).toHaveLength(1);
    expect(mocks.create.mock.calls[0][0].data.guestCapabilityHash).toBe(hashGuestCapability(result.guestCapability));
    for (const field of ["guestCapabilityHash", "guestSseTicketHash", "guestSseTicketExpiresAt", "guestSseTicketUsedAt"]) {
      expect(result).not.toHaveProperty(field);
      expect(JSON.stringify(mocks.logAudit.mock.calls)).not.toContain(field);
      expect(JSON.stringify(mocks.publishSSE.mock.calls)).not.toContain(field);
    }
    expect(JSON.stringify(mocks.logAudit.mock.calls)).not.toContain(result.guestCapability);
    expect(JSON.stringify(mocks.publishSSE.mock.calls)).not.toContain(result.guestCapability);
  });

  it.each([
    ["missing", undefined],
    ["wrong", "wrong"],
    ["another request", "b".repeat(43)],
  ])("status returns 404 for %s capability", async (_name, capability) => {
    mocks.findUnique.mockResolvedValue({ id: 42, guestCapabilityHash: hash });
    const headers = capability ? { "x-guest-capability": capability } : undefined;
    const response = await responseOf(await status(request("http://localhost/api/requests/42", { headers }), params("42")));
    expect(response.status).toBe(404);
  });

  it("status succeeds with matching header capability", async () => {
    mocks.findUnique.mockResolvedValue({ id: 42, guestCapabilityHash: hash });
    mocks.findFirst.mockResolvedValue({ id: 42, status: "PENDING" });
    const response = await responseOf(await status(request("http://localhost/api/requests/42", { headers: { "x-guest-capability": token } }), params("42")));
    expect(response.status).toBe(200);
  });

  it("malformed status ID is a non-enumerating 404 without DB access", async () => {
    const response = await responseOf(await status(request("http://localhost/api/requests/nope", { headers: { "x-guest-capability": token } }), params("nope")));
    expect(response.status).toBe(404);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("guest cancel requires matching header capability", async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING", buggy_id: null, guest_capability_hash: hash }]);
    mocks.update.mockResolvedValue({ id: 42, hotelId: 1, status: "CANCELLED" });
    const ok = await responseOf(await cancel(request("http://localhost/api/requests/42/cancel", { method: "POST", headers: { "x-guest-capability": token } }), params("42")));
    const denied = await responseOf(await cancel(request("http://localhost/api/requests/42/cancel", { method: "POST" }), params("42")));
    expect(ok.status).toBe(200);
    expect(denied.status).toBe(404);
  });

  it.each([
    ["accept", async () => {
      mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING" }]);
      mocks.buggyDriverFindFirst.mockResolvedValue({ buggyId: 9, buggy: { status: "AVAILABLE" } });
      mocks.txRequestFindUnique.mockResolvedValue({ requestedAt: new Date(), locationId: 7 });
      mocks.update.mockResolvedValue({ id: 42, status: "ACCEPTED" });
      return RequestService.accept(1, 42, 3);
    }],
    ["complete", async () => {
      mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", accepted_by_id: 3, buggy_id: 9, requested_at: new Date(), location_id: 7 }]);
      mocks.update.mockResolvedValue({ id: 42, status: "COMPLETED" });
      return RequestService.complete(1, 42, 3);
    }],
    ["authenticated cancel", async () => {
      mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING", buggy_id: null }]);
      mocks.update.mockResolvedValue({ id: 42, status: "CANCELLED" });
      return RequestService.cancel(1, 42, "DRIVER", 3);
    }],
  ])("uses a safe select for %s response", async (_flow, run) => {
    const result = await run();
    const query = mocks.update.mock.calls[0][0];
    expect(query).toHaveProperty("select");
    for (const field of ["guestCapabilityHash", "guestSseTicketHash", "guestSseTicketExpiresAt", "guestSseTicketUsedAt", "guestFcmToken", "guestFcmTokenExpiresAt", "guestPushSubscription"]) {
      expect(query.select).not.toHaveProperty(field);
      expect(result).not.toHaveProperty(field);
    }
  });

  it("locks complete state, validates the locked row, and publishes only after commit", async () => {
    const order: string[] = [];
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", accepted_by_id: 3, buggy_id: 9, requested_at: new Date(), location_id: 7 }]);
    mocks.update.mockResolvedValue({ id: 42, status: "COMPLETED" });
    mocks.auditCreate.mockImplementation(() => { order.push("audit"); return Promise.resolve({}); });
    mocks.publishSSE.mockImplementation(() => { order.push("publish"); });

    await RequestService.complete(1, 42, 3);

    expect(String(mocks.queryRaw.mock.calls[0][0])).toMatch(/SELECT[\s\S]*accepted_by_id[\s\S]*FOR UPDATE/i);
    expect(mocks.txRequestFindFirst).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.buggyUpdate).toHaveBeenCalledWith({ where: { id: 9 }, data: { status: "AVAILABLE", currentLocationId: 7 } });
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    expect(order).toEqual(["audit", "publish", "publish"]);
  });

  it("atomically reserves the assigned buggy before accepting and publishes only after commit", async () => {
    const order: string[] = [];
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING" }]);
    mocks.buggyDriverFindFirst.mockResolvedValue({ buggyId: 9, buggy: { status: "AVAILABLE" } });
    mocks.txRequestFindUnique.mockResolvedValue({ requestedAt: new Date(), locationId: 7 });
    mocks.buggyUpdateMany.mockResolvedValue({ count: 1 });
    mocks.update.mockResolvedValue({ id: 42, status: "ACCEPTED" });
    mocks.auditCreate.mockImplementation(() => { order.push("audit"); return Promise.resolve({}); });
    mocks.publishSSE.mockImplementation(() => { order.push("publish"); });

    await RequestService.accept(1, 42, 3);

    expect(mocks.buggyUpdateMany).toHaveBeenCalledWith({
      where: { id: 9, hotelId: 1, status: "AVAILABLE" },
      data: { status: "BUSY", currentLocationId: 7 },
    });
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
    expect(order).toEqual(["audit", "publish", "publish"]);
  });

  it("rolls back acceptance contract when atomic buggy reservation loses the race", async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING" }]);
    mocks.buggyDriverFindFirst.mockResolvedValue({ buggyId: 9, buggy: { status: "AVAILABLE" } });
    mocks.txRequestFindUnique.mockResolvedValue({ requestedAt: new Date(), locationId: 7 });
    mocks.buggyUpdateMany.mockResolvedValue({ count: 0 });

    await expect(RequestService.accept(1, 42, 3)).rejects.toMatchObject({ statusCode: 409, code: "BUGGY_NOT_AVAILABLE" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
    expect(mocks.publishSSE).not.toHaveBeenCalled();
  });

  it("rejects another driver cancelling an accepted request without mutations", async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", buggy_id: 9, accepted_by_id: 4 }]);

    await expect(RequestService.cancel(1, 42, "DRIVER", 3)).rejects.toMatchObject({ statusCode: 403, code: "NOT_ASSIGNED_DRIVER" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.buggyUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it("allows the assigned driver to cancel an accepted request", async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", buggy_id: 9, accepted_by_id: 3 }]);
    mocks.update.mockResolvedValue({ id: 42, status: "CANCELLED" });

    await RequestService.cancel(1, 42, "DRIVER", 3);

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.buggyUpdate).toHaveBeenCalledOnce();
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it.each(["cross-tenant", "inactive"])("rejects a %s completion location without mutations", async () => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", accepted_by_id: 3, buggy_id: 9, requested_at: new Date(), location_id: 7 }]);
    mocks.txLocationFindFirst.mockResolvedValue(null);

    await expect(RequestService.complete(1, 42, 3, 8)).rejects.toMatchObject({ statusCode: 404, code: "LOCATION_NOT_FOUND" });
    expect(mocks.txLocationFindFirst).toHaveBeenCalledWith({ where: { id: 8, hotelId: 1, isActive: true }, select: { id: true } });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.buggyUpdate).not.toHaveBeenCalled();
    expect(mocks.auditCreate).not.toHaveBeenCalled();
  });

  it.each([
    ["guest", () => RequestService.cancelByGuest(42, token)],
    ["authenticated", () => RequestService.cancel(1, 42, "DRIVER", 3)],
  ])("serializes %s accept/cancel race and atomically updates request, buggy, audit", async (_flow, run) => {
    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "ACCEPTED", buggy_id: 9, accepted_by_id: 3, guest_capability_hash: hash }]);
    mocks.update.mockResolvedValue({ id: 42, hotelId: 1, locationId: 7, buggyId: 9, status: "CANCELLED", cancelledBy: "GUEST" });
    await run();
    expect(String(mocks.queryRaw.mock.calls[0][0])).toContain("FOR UPDATE");
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.buggyUpdate).toHaveBeenCalledWith({ where: { id: 9 }, data: { status: "AVAILABLE" } });
    expect(mocks.auditCreate).toHaveBeenCalledOnce();
  });

  it("invalid session cookie returns 401; never falls back to guest capability", async () => {
    mocks.sessionFindUnique.mockResolvedValue(null);
    const response = await responseOf(await cancel(request("http://localhost/api/requests/42/cancel", { method: "POST", headers: { cookie: "session_token=bad", "x-guest-capability": token } }), params("42")));
    expect(response.status).toBe(401);
  });

  it("chains create capability through status, ticket, one-time SSE, and cancel", async () => {
    mocks.findFirst.mockResolvedValue({ id: 7, name: "Lobby" });
    mocks.create.mockImplementation(({ data }) => Promise.resolve({ id: 42, ...data, location: { id: 7 } }));
    const created = await RequestService.create(1, { locationId: 7 });
    mocks.findUnique.mockResolvedValue({ id: 42, guestCapabilityHash: hashGuestCapability(created.guestCapability) });
    mocks.findFirst.mockResolvedValue({ id: 42, status: "PENDING" });
    expect((await responseOf(await status(request("http://localhost/api/requests/42", { headers: { "x-guest-capability": created.guestCapability } }), params("42")))).status).toBe(200);

    mocks.update.mockResolvedValue({ id: 42 });
    const ticketResponse = await responseOf(await issueTicket(request("http://localhost/api/requests/42/sse-ticket", { method: "POST", headers: { "x-guest-capability": created.guestCapability } }), params("42")));
    const { data: ticketData } = await ticketResponse.json();
    mocks.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const url = `http://localhost/api/sse/guest/42?ticket=${ticketData.ticket}`;
    expect((await stream(request(url), streamParams("42"))).status).toBe(200);
    expect((await stream(request(url), streamParams("42"))).status).toBe(404);

    mocks.queryRaw.mockResolvedValue([{ id: 42, hotel_id: 1, status: "PENDING", buggy_id: null, guest_capability_hash: hashGuestCapability(created.guestCapability) }]);
    mocks.update.mockResolvedValue({ id: 42, hotelId: 1, locationId: 7, buggyId: null, status: "CANCELLED", cancelledBy: "GUEST" });
    const cancelled = await responseOf(await cancel(request("http://localhost/api/requests/42/cancel", { method: "POST", headers: { "x-guest-capability": created.guestCapability } }), params("42")));
    expect(cancelled.status).toBe(200);
    expect(JSON.stringify(await cancelled.json())).not.toContain("guestCapabilityHash");
  });

  it.each(["", "short", "a".repeat(44), "!".repeat(43)])("returns 404 for malformed capability %j", async (capability) => {
    const response = await responseOf(await status(request("http://localhost/api/requests/42", { headers: { "x-guest-capability": capability } }), params("42")));
    expect(response.status).toBe(404);
  });

  it("rejects an expired SSE ticket", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await stream(request(`http://localhost/api/sse/guest/42?ticket=${token}`), streamParams("42"));
    expect(response.status).toBe(404);
    expect(mocks.updateMany.mock.calls[0][0].where.guestSseTicketExpiresAt.gt).toBeInstanceOf(Date);
  });

  it("returns 404 when a real ticket is used for another request", async () => {
    mocks.updateMany.mockImplementation(({ where }) => Promise.resolve({ count: where.id === 42 ? 1 : 0 }));
    expect((await stream(request(`http://localhost/api/sse/guest/43?ticket=${token}`), streamParams("43"))).status).toBe(404);
    expect(mocks.updateMany.mock.calls[0][0].where).toMatchObject({ id: 43, guestSseTicketHash: hash });
  });

  it("rejects a valid capability belonging to another request", async () => {
    mocks.findUnique.mockResolvedValue({ id: 43, guestCapabilityHash: hashGuestCapability("b".repeat(43)) });
    const response = await responseOf(await status(request("http://localhost/api/requests/43", { headers: { "x-guest-capability": token } }), params("43")));
    expect(response.status).toBe(404);
  });
});
