import { prisma } from "@/lib/db";

export const MonitorService = {
  async getState(hotelId: number) {
    const [locations, buggies, requests] = await Promise.all([
      prisma.location.findMany({
        where: { hotelId, isActive: true },
        select: { id: true, name: true, mapX: true, mapY: true, displayOrder: true },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      }),
      prisma.buggy.findMany({
        where: { hotelId, isActive: true },
        select: {
          id: true,
          code: true,
          icon: true,
          status: true,
          currentLocationId: true,
          drivers: {
            where: { isActive: true },
            select: { driverId: true, isPrimary: true, driver: { select: { id: true, fullName: true } } },
            orderBy: { isPrimary: "desc" },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.buggyRequest.findMany({
        where: { hotelId, status: { in: ["PENDING", "ACCEPTED"] } },
        select: {
          id: true,
          status: true,
          guestName: true,
          roomNumber: true,
          requestedAt: true,
          acceptedAt: true,
          locationId: true,
          buggyId: true,
          acceptedById: true,
        },
        orderBy: { requestedAt: "asc" },
      }),
    ]);

    return {
      locations,
      buggies: buggies.map((b) => ({
        id: b.id,
        code: b.code,
        icon: b.icon,
        status: b.status,
        currentLocationId: b.currentLocationId,
        drivers: b.drivers.map((d) => ({ id: d.driver.id, fullName: d.driver.fullName })),
      })),
      requests,
    };
  },
};
