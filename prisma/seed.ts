import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Hotel
  const hotel = await prisma.hotel.upsert({
    where: { code: "DEMO" },
    update: {},
    create: {
      code: "DEMO",
      name: "Demo Resort & Spa",
      timezone: "Europe/Istanbul",
      address: "Demo Address 123",
      phone: "+90 555 000 0000",
      email: "info@demoresort.com",
      isActive: true,
      setupCompleted: true,
    },
  });

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      hotelId: hotel.id,
      username: "admin",
      passwordHash: adminHash,
      role: "ADMIN",
      fullName: "System Admin",
      email: "admin@demoresort.com",
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Driver users
  const driverHash = await bcrypt.hash("driver123", 10);
  const driver1 = await prisma.user.upsert({
    where: { username: "driver1" },
    update: {},
    create: {
      hotelId: hotel.id,
      username: "driver1",
      passwordHash: driverHash,
      role: "DRIVER",
      fullName: "Ahmet Yilmaz",
      phone: "+90 555 111 1111",
      isActive: true,
    },
  });

  const driver2 = await prisma.user.upsert({
    where: { username: "driver2" },
    update: {},
    create: {
      hotelId: hotel.id,
      username: "driver2",
      passwordHash: driverHash,
      role: "DRIVER",
      fullName: "Mehmet Demir",
      phone: "+90 555 222 2222",
      isActive: true,
    },
  });

  // Locations
  const lobby = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Main Lobby",
      description: "Hotel main entrance lobby",
      displayOrder: 1,
      isActive: true,
    },
  });

  const pool = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Pool Area",
      description: "Swimming pool area",
      displayOrder: 2,
      isActive: true,
    },
  });

  const beach = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Beach Access",
      description: "Private beach access point",
      displayOrder: 3,
      isActive: true,
    },
  });

  const spa = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Spa & Wellness",
      description: "Spa entrance",
      displayOrder: 4,
      isActive: true,
    },
  });

  const restaurant = await prisma.location.create({
    data: {
      hotelId: hotel.id,
      name: "Main Restaurant",
      description: "Hotel main restaurant entrance",
      displayOrder: 5,
      isActive: true,
    },
  });

  // Buggies
  const buggy1 = await prisma.buggy.create({
    data: {
      hotelId: hotel.id,
      code: "BG-001",
      model: "Club Car Onward 4",
      licensePlate: "34-SC-001",
      icon: "🚗",
      status: "AVAILABLE",
      currentLocationId: lobby.id,
      isActive: true,
    },
  });

  const buggy2 = await prisma.buggy.create({
    data: {
      hotelId: hotel.id,
      code: "BG-002",
      model: "Yamaha Drive2",
      licensePlate: "34-SC-002",
      icon: "🚙",
      status: "AVAILABLE",
      currentLocationId: pool.id,
      isActive: true,
    },
  });

  const buggy3 = await prisma.buggy.create({
    data: {
      hotelId: hotel.id,
      code: "BG-003",
      model: "EZGO Express S4",
      licensePlate: "34-SC-003",
      icon: "🛺",
      status: "OFFLINE",
      currentLocationId: restaurant.id,
      isActive: true,
    },
  });

  // Buggy-Driver assignments
  await prisma.buggyDriver.create({
    data: {
      buggyId: buggy1.id,
      driverId: driver1.id,
      isActive: true,
      isPrimary: true,
    },
  });

  await prisma.buggyDriver.create({
    data: {
      buggyId: buggy2.id,
      driverId: driver2.id,
      isActive: true,
      isPrimary: true,
    },
  });

  // System settings
  await prisma.systemSetting.create({
    data: {
      hotelId: hotel.id,
      key: "request_timeout_minutes",
      value: "60",
    },
  });

  await prisma.systemSetting.create({
    data: {
      hotelId: hotel.id,
      key: "notification_retry_max",
      value: "3",
    },
  });

  console.log("Seed data created successfully:");
  console.log(`  Hotel: ${hotel.name} (${hotel.code})`);
  console.log("  Users: admin/admin123, driver1/driver123, driver2/driver123");
  console.log(`  Locations: ${5} created`);
  console.log(`  Buggies: ${3} created`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
