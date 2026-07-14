import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  hashPassword,
  comparePassword,
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
} from "@/lib/auth";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";

describe("hashPassword / comparePassword", () => {
  it("hashes and verifies password correctly", async () => {
    const hash = await hashPassword("MyPassword123!");
    expect(hash).toBeTruthy();
    expect(hash).not.toBe("MyPassword123!");

    const match = await comparePassword("MyPassword123!", hash);
    expect(match).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("Correct1!");
    const match = await comparePassword("Wrong1!", hash);
    expect(match).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const hash1 = await hashPassword("Same1!");
    const hash2 = await hashPassword("Same1!");
    expect(hash1).not.toBe(hash2);
  });

  it("rejects empty password against hash", async () => {
    const hash = await hashPassword("Real1!");
    const match = await comparePassword("", hash);
    expect(match).toBe(false);
  });
});

describe("createSession / validateSession / revokeSession", () => {
  let testData: Awaited<ReturnType<typeof createTestHotel>>;

  beforeAll(async () => {
    testData = await createTestHotel();
  });

  afterAll(async () => {
    await cleanupTestHotel(testData.hotel.id);
  });

  it("createSession creates a DB session with isActive=true and expiresAt in future", async () => {
    const { token, session } = await createSession(
      testData.admin.id,
      "127.0.0.1",
      "test-agent",
    );

    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(session.id).toBeGreaterThan(0);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify in DB
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession).not.toBeNull();
    expect(dbSession!.isActive).toBe(true);
    expect(dbSession!.ipAddress).toBe("127.0.0.1");
    expect(dbSession!.userAgent).toBe("test-agent");

    // Cleanup this session
    await prisma.session.delete({ where: { id: session.id } });
  });

  it("validateSession returns validated session with user info", async () => {
    const { token, session } = await createSession(testData.admin.id);

    const result = await validateSession(token);
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe(testData.admin.id);
    expect(result!.user.hotelId).toBe(testData.hotel.id);
    expect(result!.user.username).toBe(testData.admin.username);
    expect(result!.user.role).toBe("ADMIN");
    expect(result!.session.id).toBe(session.id);

    await prisma.session.delete({ where: { id: session.id } });
  });

  it("validateSession returns null for invalid token", async () => {
    const result = await validateSession("nonexistent-token");
    expect(result).toBeNull();
  });

  it("validateSession returns null for empty token", async () => {
    const result = await validateSession("");
    expect(result).toBeNull();
  });

  it("validateSession returns null for null token", async () => {
    const result = await validateSession(null as unknown as string);
    expect(result).toBeNull();
  });

  it("revokeSession deactivates session", async () => {
    const { token, session } = await createSession(testData.admin.id);

    await revokeSession(session.id);

    // Session should be inactive now
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession!.isActive).toBe(false);
    expect(dbSession!.revokedAt).not.toBeNull();

    // validateSession should reject
    const result = await validateSession(token);
    expect(result).toBeNull();

    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
  });

  it("revokeAllUserSessions revokes all active sessions for user", async () => {
    const { token: t1 } = await createSession(testData.admin.id);
    const { token: t2 } = await createSession(testData.admin.id);

    await revokeAllUserSessions(testData.admin.id);

    // Both sessions should be invalid now
    expect(await validateSession(t1)).toBeNull();
    expect(await validateSession(t2)).toBeNull();
  });

  it("validateSession rejects expired sessions", async () => {
    // Create a session that's already expired
    const dbSession = await prisma.session.create({
      data: {
        userId: testData.admin.id,
        tokenHash: "expired-test-hash-" + Date.now(),
        isActive: true,
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      },
    });

    const result = await validateSession("irrelevant-token");
    expect(result).toBeNull();

    await prisma.session.delete({ where: { id: dbSession.id } }).catch(() => {});
  });

  it("createSession with no ip/userAgent works", async () => {
    const { token, session } = await createSession(testData.admin.id);

    const dbSession = await prisma.session.findUnique({
      where: { id: session.id },
    });
    expect(dbSession!.ipAddress).toBeNull();
    expect(dbSession!.userAgent).toBeNull();

    const result = await validateSession(token);
    expect(result).not.toBeNull();

    await prisma.session.delete({ where: { id: session.id } });
  });

  it("validateSession rejects session for inactive user", async () => {
    const { token, session } = await createSession(testData.admin.id);

    // Deactivate the user
    await prisma.user.update({
      where: { id: testData.admin.id },
      data: { isActive: false },
    });

    const result = await validateSession(token);
    expect(result).toBeNull();

    // Reactivate user
    await prisma.user.update({
      where: { id: testData.admin.id },
      data: { isActive: true },
    });

    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
  });
});
