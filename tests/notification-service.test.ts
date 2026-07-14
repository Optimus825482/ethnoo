import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external packages before anything else
vi.mock("firebase-admin", () => {
  const mockMessaging = {
    send: vi.fn().mockResolvedValue({}),
  };
  const mockAppCheck = {
    apps: [],
    credential: { cert: vi.fn() },
    initializeApp: vi.fn(),
    messaging: vi.fn(() => mockMessaging),
  };
  return {
    __esModule: true,
    default: mockAppCheck,
    apps: mockAppCheck.apps,
    credential: mockAppCheck.credential,
    initializeApp: mockAppCheck.initializeApp,
    messaging: mockAppCheck.messaging,
  };
});

vi.mock("web-push", () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue({}),
}));

// Now import modules under test
import { prisma } from "./setup";
import {
  getVapidPublicKey,
  saveFcmToken,
  sendToDrivers,
  sendToGuest,
} from "@/services/notification-service";

describe("getVapidPublicKey", () => {
  beforeEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
  });

  it("returns VAPID_PUBLIC_KEY from env", () => {
    process.env.VAPID_PUBLIC_KEY = "test-public-key";
    expect(getVapidPublicKey()).toBe("test-public-key");
  });

  it("returns empty string when env not set", () => {
    expect(getVapidPublicKey()).toBe("");
  });
});

describe("saveFcmToken", () => {
  it("updates user fcmToken and fcmTokenDate", async () => {
    const hotel = await prisma.hotel.create({
      data: {
        code: `FCM${Date.now()}`,
        name: "FCM Test Hotel",
        timezone: "UTC",
        isActive: true,
        setupCompleted: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        hotelId: hotel.id,
        username: `fcm-test-${Date.now()}`,
        passwordHash: "hash",
        role: "DRIVER",
        fullName: "FCM Test",
        isActive: true,
      },
    });

    await saveFcmToken(user.id, "test-fcm-token");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.fcmToken).toBe("test-fcm-token");
    expect(updated?.fcmTokenDate).toBeInstanceOf(Date);

    await prisma.user.delete({ where: { id: user.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  });

  it("updates pushSubscription when provided", async () => {
    const hotel = await prisma.hotel.create({
      data: {
        code: `FCMP${Date.now()}`,
        name: "FCM Push Hotel",
        timezone: "UTC",
        isActive: true,
        setupCompleted: true,
      },
    });

    const user = await prisma.user.create({
      data: {
        hotelId: hotel.id,
        username: `fcm-push-${Date.now()}`,
        passwordHash: "hash",
        role: "DRIVER",
        fullName: "FCM Push Test",
        isActive: true,
      },
    });

    await saveFcmToken(user.id, "token", '{"endpoint":"https://push.test"}');

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.pushSubscription).toBe('{"endpoint":"https://push.test"}');

    await prisma.user.delete({ where: { id: user.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  });
});

describe("sendToDrivers", () => {
  it("creates NotificationLog record", async () => {
    const hotelSeq = Date.now();
    const code = `NOTIF${hotelSeq}`;

    const hotel = await prisma.hotel.create({
      data: {
        code,
        name: "Notification Test Hotel",
        timezone: "UTC",
        isActive: true,
        setupCompleted: true,
      },
    });

    await prisma.user.create({
      data: {
        hotelId: hotel.id,
        username: `driver-${code}`,
        passwordHash: "hash",
        role: "DRIVER",
        fullName: "Notif Driver",
        isActive: true,
        fcmToken: "driver-fcm-token",
      },
    });

    await sendToDrivers(hotel.id, {
      title: "Test Title",
      body: "Test Body",
      type: "NEW_REQUEST",
    });

    const logs = await prisma.notificationLog.findMany({
      where: { hotelId: hotel.id },
    });

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].title).toBe("Test Title");
    expect(logs[0].body).toBe("Test Body");
    expect(logs[0].notificationType).toBe("NEW_REQUEST");
    expect(logs[0].status).toBe("SENT");

    // Cleanup
    await prisma.auditTrail.deleteMany({ where: { hotelId: hotel.id } }).catch(() => {});
    await prisma.notificationLog.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.user.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  });

  it("handles no active drivers gracefully", async () => {
    const hotel = await prisma.hotel.create({
      data: {
        code: `NODRV${Date.now()}`,
        name: "No Driver Hotel",
        timezone: "UTC",
        isActive: true,
        setupCompleted: true,
      },
    });

    await expect(
      sendToDrivers(hotel.id, { title: "Test", body: "Body" }),
    ).resolves.toBeUndefined();

    await prisma.hotel.delete({ where: { id: hotel.id } });
  });
});

describe("sendToGuest", () => {
  it("handles null token gracefully (returns early)", async () => {
    await expect(
      sendToGuest(1, null, { title: "Test", body: "Body" }),
    ).resolves.toBeUndefined();
  });

  it("handles undefined token gracefully (returns early)", async () => {
    await expect(
      sendToGuest(1, undefined, { title: "Test", body: "Body" }),
    ).resolves.toBeUndefined();
  });
});
