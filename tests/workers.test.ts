import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";

vi.mock("dotenv/config", () => ({}));
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: class {
    constructor() {
      // Return a valid adapter-like object so PrismaClient accepts it
      return { provider: "postgres", adapter: {} };
    }
  },
}));

// Mock node-cron
const mockSchedule = vi.fn();
vi.mock("node-cron", () => ({
  default: { schedule: mockSchedule },
  schedule: mockSchedule,
}));

describe("worker cron registrations", () => {
  it("importing workers registers three cron jobs", async () => {
    // Import to trigger cron registration
    await import("@/workers/index");

    expect(mockSchedule).toHaveBeenCalledTimes(3);

    // Check schedules
    const schedules = mockSchedule.mock.calls.map((c: unknown[]) => c[0]);
    expect(schedules).toContain("* * * * *");
    expect(schedules).toContain("0 * * * *");
    expect(schedules).toContain("0 3 * * *");
  });
});

describe("timeout logic", () => {
  let testData: Awaited<ReturnType<typeof createTestHotel>>;

  beforeAll(async () => {
    testData = await createTestHotel();
  });

  afterAll(async () => {
    await cleanupTestHotel(testData.hotel.id);
  });

  it("marks old PENDING requests as UNANSWERED", async () => {
    // Create a request older than 1 hour
    const oldRequest = await prisma.buggyRequest.create({
      data: {
        hotelId: testData.hotel.id,
        locationId: testData.location.id,
        status: "PENDING",
        guestName: "Old Guest",
        roomNumber: "999",
        requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      },
    });

    // Create a recent request that should NOT be timed out
    const recentRequest = await prisma.buggyRequest.create({
      data: {
        hotelId: testData.hotel.id,
        locationId: testData.location.id,
        status: "PENDING",
        guestName: "Recent Guest",
        roomNumber: "111",
        requestedAt: new Date(), // now
      },
    });

    // Run the same logic as the timeout worker
    const timeoutThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const result = await prisma.buggyRequest.updateMany({
      where: {
        status: "PENDING",
        requestedAt: { lte: timeoutThreshold },
      },
      data: {
        status: "UNANSWERED",
        timeoutAt: new Date(),
      },
    });

    expect(result.count).toBeGreaterThanOrEqual(1);

    // Verify old request is now UNANSWERED
    const updatedOld = await prisma.buggyRequest.findUnique({
      where: { id: oldRequest.id },
    });
    expect(updatedOld?.status).toBe("UNANSWERED");
    expect(updatedOld?.timeoutAt).toBeInstanceOf(Date);

    // Verify recent request is still PENDING
    const updatedRecent = await prisma.buggyRequest.findUnique({
      where: { id: recentRequest.id },
    });
    expect(updatedRecent?.status).toBe("PENDING");

    // Cleanup
    await prisma.buggyRequest.deleteMany({
      where: { hotelId: testData.hotel.id },
    });
  });
});
