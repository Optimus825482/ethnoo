import { prisma } from "@/lib/db";

export const MonitorService = {
  async getState(hotelId: number) {
    const now = new Date();

    const [locations, buggiesRaw, requests] = await Promise.all([
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
            select: {
              driverId: true,
              isPrimary: true,
              driver: {
                select: {
                  id: true,
                  fullName: true,
                  lastLogin: true,
                  sessions: {
                    where: { isActive: true, expiresAt: { gt: now }, revokedAt: null },
                    select: { id: true },
                    take: 1,
                  },
                },
              },
            },
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

    // Her buggy için şoförlerden en az biri aktif oturuma sahip mi kontrol et
    const buggies = buggiesRaw.map((b) => {
      const drivers = b.drivers.map((d) => ({
        id: d.driver.id,
        fullName: d.driver.fullName,
        loggedIn: d.driver.sessions.length > 0,
      }));

      // Bir araç müsait sayılır: status=AVAILABLE VE en az bir şoför giriş yapmış
      const driverLoggedIn = drivers.some((d) => d.loggedIn);
      const effectiveStatus = b.status === "AVAILABLE" && !driverLoggedIn ? "OFFLINE" : b.status;

      return {
        id: b.id,
        code: b.code,
        icon: b.icon,
        status: effectiveStatus,
        currentLocationId: b.currentLocationId,
        drivers,
        driverLoggedIn,
      };
    });

    return {
      locations,
      buggies,
      requests,
    };
  },
};
