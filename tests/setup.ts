import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { afterAll } from "vitest";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set. Configure it in .env");
}

const databaseUrl = new URL(connectionString);
if (!/(^|[_-])test([_-]|$)/i.test(databaseUrl.pathname.slice(1))) {
  throw new Error("Refusing to migrate: DATABASE_URL must name a test database");
}

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: connectionString },
  stdio: "inherit",
});

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

afterAll(async () => {
  await prisma.$disconnect();
});

/**
 * Disable audit table triggers before cleanup, re-enable after.
 * Audit_trail has onDelete: Restrict FK to hotel, so rows must be
 * deleted manually before the hotel can be dropped.
 */
export async function disableAuditTriggers(): Promise<void> {
  await prisma.$executeRawUnsafe("ALTER TABLE audit_trail DISABLE TRIGGER ALL");
}

export async function enableAuditTriggers(): Promise<void> {
  await prisma.$executeRawUnsafe("ALTER TABLE audit_trail ENABLE TRIGGER ALL");
}

/**
 * Cleanup all test data for a given hotelId.
 * Order: audit_trail (manual due to Restrict FK) -> hotel (cascade)
 */
export async function cleanupTestHotel(hotelId: number): Promise<void> {
  await disableAuditTriggers();
  await prisma.auditTrail.deleteMany({ where: { hotelId } });
  await prisma.session.deleteMany({ where: { user: { hotelId } } });
  await prisma.hotel.delete({ where: { id: hotelId } }).catch(() => {
    // Fallback: delete children manually if cascade fails
  });
  await enableAuditTriggers();
}

let _hotelSeq = 0;

/**
 * Create a full set of test data for a hotel.
 * Returns IDs for all created entities.
 */
export async function createTestHotel() {
  _hotelSeq++;
  const ts = Date.now();
  const code = `TST${ts}${_hotelSeq}`;

  const hotel = await prisma.hotel.create({
    data: {
      code,
      name: `Test Hotel ${code}`,
      timezone: "Europe/Istanbul",
      isActive: true,
      setupCompleted: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      hotelId: hotel.id,
      username: `admin-${code}`,
      passwordHash:
        "$2a$10$dummy-hash-for-testing-purposes-only-1234567890abcdef", // not used in login tests that check password
      role: "ADMIN",
      fullName: "Test Admin",
      isActive: true,
    },
  });

  const driver = await prisma.user.create({
    data: {
      hotelId: hotel.id,
      username: `driver-${code}`,
      passwordHash:
        "$2a$10$dummy-hash-for-testing-purposes-only-1234567890abcdef",
      role: "DRIVER",
      fullName: "Test Driver",
      isActive: true,
    },
  });

  const inactiveDriver = await prisma.user.create({
    data: {
      hotelId: hotel.id,
      username: `inact-driver-${code}`,
      passwordHash:
        "$2a$10$dummy-hash-for-testing-purposes-only-1234567890abcdef",
      role: "DRIVER",
      fullName: "Inactive Driver",
      isActive: false,
    },
  });

  const location = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Test Lobby",
      description: "Main lobby for testing",
      displayOrder: 1,
      isActive: true,
    },
  });

  const location2 = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Test Pool",
      description: "Pool area for testing",
      displayOrder: 2,
      isActive: true,
    },
  });

  const buggy = await prisma.buggy.create({
    data: {
      hotelId: hotel.id,
      code: `BG-${code}`,
      model: "Test Buggy Model",
      licensePlate: `TST-${_hotelSeq}`,
      icon: "T",
      status: "AVAILABLE",
      currentLocationId: location.id,
      isActive: true,
    },
  });

  const buggy2 = await prisma.buggy.create({
    data: {
      hotelId: hotel.id,
      code: `BG2-${code}`,
      model: "Second Buggy",
      status: "AVAILABLE",
      isActive: true,
    },
  });

  const assignment = await prisma.buggyDriver.create({
    data: {
      buggyId: buggy.id,
      driverId: driver.id,
      isActive: true,
      isPrimary: true,
    },
  });

  return {
    hotel,
    admin,
    driver,
    inactiveDriver,
    location,
    location2,
    buggy,
    buggy2,
    assignment,
    code,
  };
}
