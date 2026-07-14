import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";
import { hashPassword, createSession } from "@/lib/auth";
import { AuthService } from "@/services/auth-service";
import { LocationService } from "@/services/location-service";
import { BuggyService } from "@/services/buggy-service";
import { RequestService } from "@/services/request-service";
import { ApiError } from "@/lib/api-response";

// ─── Shared test data ──────────────────────────────────────────────

interface TestContext {
  hotel: Awaited<ReturnType<typeof createTestHotel>>;
  adminPassword: string;
  driverPassword: string;
}

async function buildContext(): Promise<TestContext> {
  const hotel = await createTestHotel();
  const adminPassword = "AdminPass1!";
  const driverPassword = "Driver1!Pass";

  // Update password hashes to known values
  const adminHash = await hashPassword(adminPassword);
  const driverHash = await hashPassword(driverPassword);
  await prisma.user.update({
    where: { id: hotel.admin.id },
    data: { passwordHash: adminHash },
  });
  await prisma.user.update({
    where: { id: hotel.driver.id },
    data: { passwordHash: driverHash },
  });

  return { hotel, adminPassword, driverPassword };
}

async function teardownContext(ctx: TestContext): Promise<void> {
  await cleanupTestHotel(ctx.hotel.hotel.id);
}

// ─── AuthService ───────────────────────────────────────────────────

describe("AuthService", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await buildContext();
  });

  afterAll(async () => {
    await teardownContext(ctx);
  });

  describe("login", () => {
    it("login with valid credentials returns user + session", async () => {
      const result = await AuthService.login(
        ctx.hotel.admin.username,
        ctx.adminPassword,
        "127.0.0.1",
        "test-agent",
      );

      expect(result.token).toBeTruthy();
      expect(result.session.id).toBeGreaterThan(0);
      expect(result.user.id).toBe(ctx.hotel.admin.id);
      expect(result.user.role).toBe("ADMIN");
      expect(result.user.hotelName).toBe(ctx.hotel.hotel.name);
    });

    it("login with wrong password throws 401", async () => {
      await expect(
        AuthService.login(ctx.hotel.admin.username, "Wrong1!", "127.0.0.1"),
      ).rejects.toThrow(ApiError);

      try {
        await AuthService.login(
          ctx.hotel.admin.username,
          "Wrong1!",
          "127.0.0.1",
        );
      } catch (e) {
        const apiErr = e as ApiError;
        expect(apiErr.statusCode).toBe(401);
        expect(apiErr.code).toBe("AUTH_INVALID_CREDENTIALS");
      }
    });

    it("login with nonexistent username throws 401", async () => {
      await expect(
        AuthService.login("no-such-user", ctx.adminPassword, "127.0.0.1"),
      ).rejects.toThrow(ApiError);

      try {
        await AuthService.login(
          "no-such-user",
          ctx.adminPassword,
          "127.0.0.1",
        );
      } catch (e) {
        expect((e as ApiError).statusCode).toBe(401);
      }
    });

    it("login with inactive user throws 401", async () => {
      // Deactivate the admin temporarily
      await prisma.user.update({
        where: { id: ctx.hotel.admin.id },
        data: { isActive: false },
      });

      await expect(
        AuthService.login(ctx.hotel.admin.username, ctx.adminPassword),
      ).rejects.toThrow(ApiError);

      // Reactivate
      await prisma.user.update({
        where: { id: ctx.hotel.admin.id },
        data: { isActive: true },
      });
    });
  });

  describe("getMe", () => {
    it("returns user data when active", async () => {
      const user = await AuthService.getMe(ctx.hotel.admin.id);
      expect(user.id).toBe(ctx.hotel.admin.id);
      expect(user.username).toBe(ctx.hotel.admin.username);
      expect(user.role).toBe("ADMIN");
      expect(user.hotel).toBeDefined();
      expect(user.hotel.name).toBe(ctx.hotel.hotel.name);
    });

    it("throws 401 for inactive user", async () => {
      await prisma.user.update({
        where: { id: ctx.hotel.admin.id },
        data: { isActive: false },
      });

      await expect(AuthService.getMe(ctx.hotel.admin.id)).rejects.toThrow(
        ApiError,
      );

      await prisma.user.update({
        where: { id: ctx.hotel.admin.id },
        data: { isActive: true },
      });
    });

    it("throws 401 for nonexistent user", async () => {
      await expect(AuthService.getMe(999999)).rejects.toThrow(ApiError);
    });
  });

  describe("changePassword", () => {
    it("changes password and revokes other sessions", async () => {
      const authCtx = {
        user: {
          id: ctx.hotel.driver.id,
          hotelId: ctx.hotel.hotel.id,
          username: ctx.hotel.driver.username,
          role: "DRIVER" as const,
          fullName: ctx.hotel.driver.fullName,
        },
        session: { id: 0, tokenHash: "dummy", expiresAt: new Date() },
      };

      // Create another session for the same user
      const { session: otherSession } = await createSession(
        ctx.hotel.driver.id,
      );

      await AuthService.changePassword(authCtx, ctx.driverPassword, "New1!Pass");

      // Verify password changed by trying to login with old password
      try {
        await AuthService.login(ctx.hotel.driver.username, ctx.driverPassword);
      } catch (e) {
        expect((e as ApiError).statusCode).toBe(401);
      }

      // Login with new password
      const loginResult = await AuthService.login(
        ctx.hotel.driver.username,
        "New1!Pass",
      );
      expect(loginResult.user.id).toBe(ctx.hotel.driver.id);
    });

    it("throws 400 on wrong current password", async () => {
      const authCtx = {
        user: {
          id: ctx.hotel.admin.id,
          hotelId: ctx.hotel.hotel.id,
          username: ctx.hotel.admin.username,
          role: "ADMIN" as const,
          fullName: ctx.hotel.admin.fullName,
        },
        session: { id: 0, tokenHash: "dummy", expiresAt: new Date() },
      };

      await expect(
        AuthService.changePassword(authCtx, "Wrong1!Pass", "New1!Pass"),
      ).rejects.toThrow(ApiError);
    });
  });
});

// ─── LocationService ───────────────────────────────────────────────

describe("LocationService", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await buildContext();
  });

  afterAll(async () => {
    await teardownContext(ctx);
  });

  it("creates a location", async () => {
    const loc = await LocationService.create(
      ctx.hotel.hotel.id,
      { name: "New Location", description: "Test", displayOrder: 5 },
      ctx.hotel.admin.id,
    );

    expect(loc.id).toBeGreaterThan(0);
    expect(loc.name).toBe("New Location");
    expect(loc.hotelId).toBe(ctx.hotel.hotel.id);
    expect(loc.isActive).toBe(true);

    await prisma.location.delete({ where: { id: loc.id } }).catch(() => {});
  });

  it("lists locations by hotel", async () => {
    const result = await LocationService.list(ctx.hotel.hotel.id);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    expect(result.total).toBeGreaterThanOrEqual(2);
  });

  it("lists locations with search filter", async () => {
    const result = await LocationService.list(ctx.hotel.hotel.id, {
      search: "Lobby",
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items[0].name).toContain("Lobby");
  });

  it("lists locations filtered by active status", async () => {
    const result = await LocationService.list(ctx.hotel.hotel.id, {
      isActive: false,
    });
    expect(result.items.length).toBe(0);
  });

  it("lists locations with pagination", async () => {
    const result = await LocationService.list(ctx.hotel.hotel.id, {
      page: 1,
      pageSize: 1,
    });
    expect(result.items.length).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(1);
    expect(result.totalPages).toBeGreaterThanOrEqual(2);
  });

  it("gets location by id", async () => {
    const loc = await LocationService.getById(
      ctx.hotel.hotel.id,
      ctx.hotel.location.id,
    );
    expect(loc.id).toBe(ctx.hotel.location.id);
    expect(loc.name).toBe("Test Lobby");
  });

  it("getById throws 404 for wrong hotel", async () => {
    await expect(LocationService.getById(999999, ctx.hotel.location.id))
      .rejects.toThrow(ApiError);
  });

  it("updates location", async () => {
    const updated = await LocationService.update(
      ctx.hotel.hotel.id,
      ctx.hotel.location.id,
      { name: "Updated Lobby" },
      ctx.hotel.admin.id,
    );
    expect(updated.name).toBe("Updated Lobby");

    // Restore
    await LocationService.update(
      ctx.hotel.hotel.id,
      ctx.hotel.location.id,
      { name: "Test Lobby" },
      ctx.hotel.admin.id,
    );
  });

  it("update throws 404 for nonexistent location", async () => {
    await expect(
      LocationService.update(ctx.hotel.hotel.id, 999999, { name: "X" }),
    ).rejects.toThrow(ApiError);
  });

  it("deletes location with no dependencies", async () => {
    const tempLoc = await prisma.location.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        name: "Temp Delete",
        displayOrder: 99,
        isActive: true,
      },
    });

    const result = await LocationService.delete(
      ctx.hotel.hotel.id,
      tempLoc.id,
      ctx.hotel.admin.id,
    );
    expect(result.deleted).toBe(true);
  });

  it("soft-deletes location with dependent requests", async () => {
    // Create a request referencing the location
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const result = await LocationService.delete(
      ctx.hotel.hotel.id,
      ctx.hotel.location.id,
      ctx.hotel.admin.id,
    );
    expect(result.deactivated).toBe(true);

    // Reactivate
    await prisma.location.update({
      where: { id: ctx.hotel.location.id },
      data: { isActive: true },
    });

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("generates QR code data", async () => {
    const updated = await LocationService.generateQR(
      ctx.hotel.hotel.id,
      ctx.hotel.location.id,
      ctx.hotel.admin.id,
    );

    expect(updated.qrCodeData).toBeTruthy();
    const qrData = JSON.parse(updated.qrCodeData!);
    expect(qrData.type).toBe("shuttlecall");
    expect(qrData.hotelId).toBe(ctx.hotel.hotel.id);
    expect(qrData.locationId).toBe(ctx.hotel.location.id);
  });
});

// ─── BuggyService ──────────────────────────────────────────────────

describe("BuggyService", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await buildContext();
  });

  afterAll(async () => {
    await teardownContext(ctx);
  });

  it("creates a buggy", async () => {
    const buggy = await BuggyService.create(
      ctx.hotel.hotel.id,
      {
        code: `NEW-${ctx.hotel.code}`,
        model: "New Model",
        status: "AVAILABLE",
      },
      ctx.hotel.admin.id,
    );

    expect(buggy.id).toBeGreaterThan(0);
    expect(buggy.code).toBe(`NEW-${ctx.hotel.code}`);
    expect(buggy.hotelId).toBe(ctx.hotel.hotel.id);
    expect(buggy.status).toBe("AVAILABLE");

    await prisma.buggy.delete({ where: { id: buggy.id } }).catch(() => {});
  });

  it("create rejects duplicate code", async () => {
    await expect(
      BuggyService.create(ctx.hotel.hotel.id, {
        code: ctx.hotel.buggy.code,
      }),
    ).rejects.toThrow(ApiError);
  });

  it("lists buggies by hotel", async () => {
    const result = await BuggyService.list(ctx.hotel.hotel.id);
    expect(result.total).toBeGreaterThanOrEqual(2);
    expect(result.items.length).toBeGreaterThanOrEqual(2);
  });

  it("lists buggies with search filter", async () => {
    const result = await BuggyService.list(ctx.hotel.hotel.id, {
      search: ctx.hotel.buggy.code.slice(0, 5),
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("lists buggies filtered by status", async () => {
    const result = await BuggyService.list(ctx.hotel.hotel.id, {
      status: "AVAILABLE",
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
  });

  it("gets buggy by id with drivers included", async () => {
    const buggy = await BuggyService.getById(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy.id,
    );
    expect(buggy.id).toBe(ctx.hotel.buggy.id);
    expect(buggy.drivers).toBeDefined();
    expect(buggy.drivers.length).toBeGreaterThanOrEqual(1);
    expect(buggy.drivers[0].driver.id).toBe(ctx.hotel.driver.id);
  });

  it("getById throws 404 for nonexistent buggy", async () => {
    await expect(BuggyService.getById(ctx.hotel.hotel.id, 999999))
      .rejects.toThrow(ApiError);
  });

  it("updates buggy fields", async () => {
    const updated = await BuggyService.update(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy.id,
      { model: "Updated Model" },
      ctx.hotel.admin.id,
    );
    expect(updated.model).toBe("Updated Model");
  });

  it("updates buggy status", async () => {
    const updated = await BuggyService.updateStatus(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy.id,
      "BUSY",
      ctx.hotel.admin.id,
    );
    expect(updated.status).toBe("BUSY");

    // Reset
    await BuggyService.updateStatus(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy.id,
      "AVAILABLE",
    );
  });

  it("assigns driver to buggy", async () => {
    const freshPw = await hashPassword("Fresh1!Pass");
    const freshDriver = await prisma.user.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        username: `fresh-assign-${Date.now()}`,
        passwordHash: freshPw,
        role: "DRIVER",
        fullName: "Fresh Assign Driver",
        isActive: true,
      },
    });

    const assignment = await BuggyService.assignDriver(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy2.id,
      freshDriver.id,
      true,
      ctx.hotel.admin.id,
    );

    expect(assignment.isActive).toBe(true);
    expect(assignment.isPrimary).toBe(true);

    // Cleanup
    await prisma.buggyDriver
      .delete({ where: { id: assignment.id } })
      .catch(() => {});
    await prisma.user.delete({ where: { id: freshDriver.id } }).catch(() => {});
  });

  it("assigning driver to second buggy throws 409 when already assigned elsewhere", async () => {
    // driver is already assigned to buggy via test fixture
    await expect(
      BuggyService.assignDriver(
        ctx.hotel.hotel.id,
        ctx.hotel.buggy2.id,
        ctx.hotel.driver.id,
        false,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("assignDriver throws 404 for nonexistent buggy", async () => {
    // Create a fresh driver for this test
    const freshPw = await hashPassword("Fresh1!Pass");
    const freshDriver = await prisma.user.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        username: `fresh-${Date.now()}`,
        passwordHash: freshPw,
        role: "DRIVER",
        fullName: "Fresh Driver",
        isActive: true,
      },
    });

    await expect(
      BuggyService.assignDriver(ctx.hotel.hotel.id, 999999, freshDriver.id, false),
    ).rejects.toThrow(ApiError);

    await prisma.user.delete({ where: { id: freshDriver.id } }).catch(() => {});
  });

  it("assignDriver throws 404 for nonexistent driver", async () => {
    await expect(
      BuggyService.assignDriver(
        ctx.hotel.hotel.id,
        ctx.hotel.buggy.id,
        999999,
        false,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("unassigns driver from buggy", async () => {
    const result = await BuggyService.unassignDriver(
      ctx.hotel.hotel.id,
      ctx.hotel.buggy.id,
      ctx.hotel.driver.id,
      ctx.hotel.admin.id,
    );
    expect(result.success).toBe(true);

    // Verify assignment is inactive
    const assignment = await prisma.buggyDriver.findFirst({
      where: {
        buggyId: ctx.hotel.buggy.id,
        driverId: ctx.hotel.driver.id,
      },
    });
    expect(assignment!.isActive).toBe(false);
    expect(assignment!.unassignedAt).not.toBeNull();

    // Reassign for other tests
    await prisma.buggyDriver.update({
      where: { id: ctx.hotel.assignment.id },
      data: { isActive: true, unassignedAt: null },
    });
  });

  it("unassignDriver throws 404 when no active assignment", async () => {
    await expect(
      BuggyService.unassignDriver(
        ctx.hotel.hotel.id,
        ctx.hotel.buggy2.id, // no assignment for buggy2
        ctx.hotel.driver.id,
      ),
    ).rejects.toThrow(ApiError);
  });

  it("lists available drivers", async () => {
    const drivers = await BuggyService.listDrivers(ctx.hotel.hotel.id);
    expect(drivers.length).toBeGreaterThanOrEqual(1);
    expect(drivers.map((d) => d.id)).toContain(ctx.hotel.driver.id);
    // Inactive driver should not appear
    expect(drivers.map((d) => d.id)).not.toContain(ctx.hotel.inactiveDriver.id);
  });
});

// ─── RequestService ────────────────────────────────────────────────

describe("RequestService", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await buildContext();
  });

  afterAll(async () => {
    await teardownContext(ctx);
  });

  it("creates a guest request", async () => {
    const req = await RequestService.create(
      ctx.hotel.hotel.id,
      {
        locationId: ctx.hotel.location.id,
        guestName: "John Doe",
        roomNumber: "101",
        phone: "+123",
        notes: "Near elevator",
      },
      "127.0.0.1",
    );

    expect(req.id).toBeGreaterThan(0);
    expect(req.status).toBe("PENDING");
    expect(req.locationId).toBe(ctx.hotel.location.id);
    expect(req.guestName).toBe("John Doe");
    expect(req.roomNumber).toBe("101");
    expect(req.hotelId).toBe(ctx.hotel.hotel.id);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("create throws 404 for nonexistent location", async () => {
    await expect(
      RequestService.create(ctx.hotel.hotel.id, { locationId: 999999 }),
    ).rejects.toThrow(ApiError);
  });

  it("create throws 404 for inactive location", async () => {
    await prisma.location.update({
      where: { id: ctx.hotel.location.id },
      data: { isActive: false },
    });

    await expect(
      RequestService.create(ctx.hotel.hotel.id, {
        locationId: ctx.hotel.location.id,
      }),
    ).rejects.toThrow(ApiError);

    await prisma.location.update({
      where: { id: ctx.hotel.location.id },
      data: { isActive: true },
    });
  });

  it("accepts a pending request", async () => {
    // Create a request
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const accepted = await RequestService.accept(
      ctx.hotel.hotel.id,
      req.id,
      ctx.hotel.driver.id,
    );

    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.acceptedById).toBe(ctx.hotel.driver.id);
    expect(accepted.buggyId).toBe(ctx.hotel.buggy.id);
    expect(accepted.acceptedAt).toBeInstanceOf(Date);
    expect(accepted.responseTime).toBeGreaterThanOrEqual(0);

    // Buggy should be BUSY now
    const buggy = await prisma.buggy.findUnique({
      where: { id: ctx.hotel.buggy.id },
    });
    expect(buggy!.status).toBe("BUSY");

    // Reset buggy status and cleanup
    await prisma.buggy.update({
      where: { id: ctx.hotel.buggy.id },
      data: { status: "AVAILABLE" },
    });
    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("accept throws 409 if request is not PENDING", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "COMPLETED",
        requestedAt: new Date(),
      },
    });

    await expect(
      RequestService.accept(ctx.hotel.hotel.id, req.id, ctx.hotel.driver.id),
    ).rejects.toThrow(ApiError);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("completes an accepted request", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        buggyId: ctx.hotel.buggy.id,
        acceptedById: ctx.hotel.driver.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        requestedAt: new Date(),
      },
    });

    await prisma.buggy.update({
      where: { id: ctx.hotel.buggy.id },
      data: { status: "BUSY" },
    });

    const completed = await RequestService.complete(
      ctx.hotel.hotel.id,
      req.id,
      ctx.hotel.driver.id,
      ctx.hotel.location2.id,
    );

    expect(completed.status).toBe("COMPLETED");
    expect(completed.completedAt).toBeInstanceOf(Date);
    expect(completed.completionTime).toBeGreaterThanOrEqual(0);
    expect(completed.completionLocationId).toBe(ctx.hotel.location2.id);

    // Buggy should be AVAILABLE again
    const buggy = await prisma.buggy.findUnique({
      where: { id: ctx.hotel.buggy.id },
    });
    expect(buggy!.status).toBe("AVAILABLE");

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("complete throws 403 if wrong driver tries", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        buggyId: ctx.hotel.buggy.id,
        acceptedById: ctx.hotel.driver.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        requestedAt: new Date(),
      },
    });

    // Use admin ID (not the accepted driver) - this will fail
    await expect(
      RequestService.complete(ctx.hotel.hotel.id, req.id, ctx.hotel.admin.id),
    ).rejects.toThrow(ApiError);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("complete throws 409 if not in ACCEPTED state", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    await expect(
      RequestService.complete(ctx.hotel.hotel.id, req.id, ctx.hotel.driver.id),
    ).rejects.toThrow(ApiError);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("cancels a request by DRIVER", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        buggyId: ctx.hotel.buggy.id,
        acceptedById: ctx.hotel.driver.id,
        status: "ACCEPTED",
        acceptedAt: new Date(),
        requestedAt: new Date(),
      },
    });

    await prisma.buggy.update({
      where: { id: ctx.hotel.buggy.id },
      data: { status: "BUSY" },
    });

    const cancelled = await RequestService.cancel(
      ctx.hotel.hotel.id,
      req.id,
      "DRIVER",
      ctx.hotel.driver.id,
      "Too far away",
    );

    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledBy).toBe("DRIVER");

    // Buggy should be AVAILABLE
    const buggy = await prisma.buggy.findUnique({
      where: { id: ctx.hotel.buggy.id },
    });
    expect(buggy!.status).toBe("AVAILABLE");

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("cancels a request by GUEST", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const cancelled = await RequestService.cancel(
      ctx.hotel.hotel.id,
      req.id,
      "GUEST",
      undefined,
      "No longer needed",
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledBy).toBe("GUEST");

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("cancel throws 409 if already completed", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "COMPLETED",
        completedAt: new Date(),
        requestedAt: new Date(),
      },
    });

    await expect(
      RequestService.cancel(ctx.hotel.hotel.id, req.id, "ADMIN", ctx.hotel.admin.id),
    ).rejects.toThrow(ApiError);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("timeouts pending requests older than 1 hour", async () => {
    const oldReq = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    });

    const recentReq = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(), // just now
      },
    });

    const count = await RequestService.timeoutPending(ctx.hotel.hotel.id);
    expect(count).toBeGreaterThanOrEqual(1);

    // old request should be UNANSWERED
    const oldDb = await prisma.buggyRequest.findUnique({
      where: { id: oldReq.id },
    });
    expect(oldDb!.status).toBe("UNANSWERED");
    expect(oldDb!.timeoutAt).toBeInstanceOf(Date);

    // recent request should still be PENDING
    const recentDb = await prisma.buggyRequest.findUnique({
      where: { id: recentReq.id },
    });
    expect(recentDb!.status).toBe("PENDING");

    await prisma.buggyRequest.delete({ where: { id: oldReq.id } }).catch(() => {});
    await prisma.buggyRequest.delete({ where: { id: recentReq.id } }).catch(() => {});
  });

  it("lists requests with filters", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const result = await RequestService.list(ctx.hotel.hotel.id, {
      status: "PENDING",
    });
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result.items.some((r) => r.id === req.id)).toBe(true);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("gets active requests", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const active = await RequestService.getActive(ctx.hotel.hotel.id);
    expect(active.length).toBeGreaterThanOrEqual(1);
    expect(active.some((r) => r.id === req.id)).toBe(true);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("getById returns full request details", async () => {
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: ctx.hotel.hotel.id,
        locationId: ctx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    const fetched = await RequestService.getById(ctx.hotel.hotel.id, req.id);
    expect(fetched.id).toBe(req.id);
    expect(fetched.location).toBeDefined();
    expect(fetched.location.name).toBe("Test Lobby");

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
  });

  it("getById throws 404 for nonexistent request", async () => {
    await expect(
      RequestService.getById(ctx.hotel.hotel.id, 999999),
    ).rejects.toThrow(ApiError);
  });

  it("getById throws 404 for request belonging to other hotel", async () => {
    const otherCtx = await buildContext();
    const req = await prisma.buggyRequest.create({
      data: {
        hotelId: otherCtx.hotel.hotel.id,
        locationId: otherCtx.hotel.location.id,
        status: "PENDING",
        requestedAt: new Date(),
      },
    });

    await expect(
      RequestService.getById(ctx.hotel.hotel.id, req.id),
    ).rejects.toThrow(ApiError);

    await prisma.buggyRequest.delete({ where: { id: req.id } }).catch(() => {});
    await teardownContext(otherCtx);
  });
});
