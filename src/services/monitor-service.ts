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
                  driverStatus: true,
                  lastGpsLat: true,
                  lastGpsLng: true,
                  lastGpsAt: true,
                  lastHeartbeat: true,
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

    // Her buggy için şoförlerden en az biri ON_DUTY + heartbeat canlı mı kontrol et
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const buggies = buggiesRaw.map((b) => {
      const drivers = b.drivers.map((d) => ({
        id: d.driver.id,
        fullName: d.driver.fullName,
        driverStatus: d.driver.driverStatus,
        lastGpsLat: d.driver.lastGpsLat,
        lastGpsLng: d.driver.lastGpsLng,
        lastGpsAt: d.driver.lastGpsAt,
        lastHeartbeat: d.driver.lastHeartbeat,
        loggedIn: d.driver.sessions.length > 0,
      }));

      // Bir araç müsait sayılır: status=AVAILABLE VE en az bir şoför ON_DUTY + heartbeat canlı
      const hasActiveDriver = drivers.some(
        (d) => d.loggedIn && d.driverStatus === "ON_DUTY" && d.lastHeartbeat && d.lastHeartbeat > fiveMinAgo
      );
      const effectiveStatus = b.status === "AVAILABLE" && !hasActiveDriver ? "OFFLINE" : b.status;

      // GPS konumu: en güncel şoförün GPS'i (son 2 dk)
      const gpsDriver = drivers.find(
        (d) => d.lastGpsLat != null && d.lastGpsAt && d.lastGpsAt > new Date(Date.now() - 2 * 60 * 1000)
      );

      return {
        id: b.id,
        code: b.code,
        icon: b.icon,
        status: effectiveStatus,
        currentLocationId: b.currentLocationId,
        drivers,
        driverLoggedIn: hasActiveDriver,
        gpsLat: gpsDriver?.lastGpsLat ?? null,
        gpsLng: gpsDriver?.lastGpsLng ?? null,
        gpsAt: gpsDriver?.lastGpsAt ?? null,
      };
    });

    return {
      locations,
      buggies,
      requests,
    };
  },
};
