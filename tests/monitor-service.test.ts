import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";
import { MonitorService } from "@/services/monitor-service";

describe("MonitorService.getState", () => {
  let hotel: Awaited<ReturnType<typeof createTestHotel>>;
  let locMapped: { id: number };
  let locUnmapped: { id: number };
  let testBuggy: { id: number; code: string };

  beforeAll(async () => {
    hotel = await createTestHotel();

    // Create an additional location with map coords
    locMapped = await prisma.location.create({
      data: { hotelId: hotel.hotel.id, name: "Aquapark", mapX: 150, mapY: 362, isActive: true },
    });

    // Create an additional location without map coords
    locUnmapped = await prisma.location.create({
      data: { hotelId: hotel.hotel.id, name: "Spa", isActive: true },
    });

    // Create a second driver for the test buggy (driver from createTestHotel
    // is already assigned to another buggy; DB has a unique constraint on driver_id)
    const testDriver = await prisma.user.create({
      data: {
        hotelId: hotel.hotel.id,
        username: `driver-t1-${hotel.code}`,
        passwordHash: "$2a$10$dummy-hash-for-testing-purposes-only-1234567890abcdef",
        role: "DRIVER",
        fullName: "Test Driver T1",
        isActive: true,
      },
    });

    testBuggy = await prisma.buggy.create({
      data: {
        hotelId: hotel.hotel.id,
        code: "BG-T1",
        status: "AVAILABLE",
        currentLocationId: locMapped.id,
        isActive: true,
      },
    });

    await prisma.buggyDriver.create({
      data: {
        buggyId: testBuggy.id,
        driverId: testDriver.id,
        isActive: true,
        isPrimary: true,
      },
    });

    // Create a PENDING request (should appear in state)
    await prisma.buggyRequest.create({
      data: {
        hotelId: hotel.hotel.id,
        locationId: locMapped.id,
        status: "PENDING",
        guestName: "Test Misafir",
        roomNumber: "101",
      },
    });

    // Create a COMPLETED request (should NOT appear in state)
    await prisma.buggyRequest.create({
      data: {
        hotelId: hotel.hotel.id,
        locationId: locMapped.id,
        status: "COMPLETED",
        guestName: "Eski",
      },
    });
  });

  afterAll(async () => {
    await cleanupTestHotel(hotel.hotel.id);
  });

  it("returns locations with map coords (null when unset), buggies with drivers, only PENDING+ACCEPTED requests", async () => {
    const state = await MonitorService.getState(hotel.hotel.id);

    // -- locations: Aquapark has mapX/mapY, Spa has null
    const aq = state.locations.find((l: any) => l.name === "Aquapark");
    expect(aq).toMatchObject({ mapX: 150, mapY: 362 });
    const spa = state.locations.find((l: any) => l.name === "Spa");
    expect(spa).toBeDefined();
    expect(spa!.mapX).toBeNull();
    // Locations from createTestHotel (Test Lobby, Test Pool) should also appear
    expect(state.locations.length).toBeGreaterThanOrEqual(4);

    // -- buggies: find our test buggy by code; createTestHotel also creates buggies
    const bgT1 = state.buggies.find((b: any) => b.code === "BG-T1");
    expect(bgT1).toBeDefined();
    expect(bgT1).toMatchObject({
      code: "BG-T1",
      status: "AVAILABLE",
      currentLocationId: locMapped.id,
    });
    expect(bgT1!.drivers.length).toBeGreaterThanOrEqual(1);
    expect(bgT1!.drivers[0]).toMatchObject({
      fullName: "Test Driver T1",
    });

    // -- requests: only PENDING (1), not COMPLETED
    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]).toMatchObject({
      status: "PENDING",
      guestName: "Test Misafir",
    });
  });
});
