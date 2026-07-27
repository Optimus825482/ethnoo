import { prisma } from "@/lib/db";

export const ReportService = {
  async getSummary(hotelId: number, dateFrom?: Date, dateTo?: Date) {
    const where = {
      hotelId,
      ...(dateFrom || dateTo) && {
        requestedAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      },
    };

    const [total, pending, accepted, completed, cancelled, unanswered, avgResponse, avgCompletion] =
      await Promise.all([
        prisma.buggyRequest.count({ where }),
        prisma.buggyRequest.count({ where: { ...where, status: "PENDING" } }),
        prisma.buggyRequest.count({ where: { ...where, status: "ACCEPTED" } }),
        prisma.buggyRequest.count({ where: { ...where, status: "COMPLETED" } }),
        prisma.buggyRequest.count({ where: { ...where, status: "CANCELLED" } }),
        prisma.buggyRequest.count({ where: { ...where, status: "UNANSWERED" } }),
        prisma.buggyRequest.aggregate({
          where: { ...where, responseTime: { not: null } },
          _avg: { responseTime: true },
        }),
        prisma.buggyRequest.aggregate({
          where: { ...where, completionTime: { not: null } },
          _avg: { completionTime: true },
        }),
      ]);

    return {
      total,
      pending,
      accepted,
      completed,
      cancelled,
      unanswered,
      avgResponseTime: avgResponse._avg.responseTime,
      avgCompletionTime: avgCompletion._avg.completionTime,
    };
  },

  async getPerformance(hotelId: number, dateFrom: Date, dateTo: Date) {
    const requests = await prisma.buggyRequest.findMany({
      where: {
        hotelId,
        requestedAt: { gte: dateFrom, lte: dateTo },
        status: "COMPLETED",
      },
      include: {
        acceptedByDriver: { select: { id: true, fullName: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    // Group by driver
    const byDriver = new Map<number, { name: string; count: number; avgResponse: number; avgCompletion: number }>();
    for (const r of requests) {
      if (!r.acceptedById) continue;
      const existing = byDriver.get(r.acceptedById) || {
        name: r.acceptedByDriver?.fullName || "Unknown",
        count: 0,
        avgResponse: 0,
        avgCompletion: 0,
      };
      existing.count++;
      if (r.responseTime) existing.avgResponse += r.responseTime;
      if (r.completionTime) existing.avgCompletion += r.completionTime;
      byDriver.set(r.acceptedById, existing);
    }

    const driverStats = Array.from(byDriver.values()).map((d) => ({
      ...d,
      avgResponse: d.count > 0 ? Math.round(d.avgResponse / d.count) : 0,
      avgCompletion: d.count > 0 ? Math.round(d.avgCompletion / d.count) : 0,
    }));

    // Group by location
    const byLocation = new Map<number, { name: string; count: number }>();
    for (const r of requests) {
      const existing = byLocation.get(r.locationId) || {
        name: r.location.name,
        count: 0,
      };
      existing.count++;
      byLocation.set(r.locationId, existing);
    }

    const locationStats = Array.from(byLocation.values()).sort((a, b) => b.count - a.count);

    return { driverStats, locationStats };
  },

  async getAuditLogs(
    hotelId: number,
    params?: { action?: string; entityType?: string; userId?: number; dateFrom?: Date; dateTo?: Date; page?: number; pageSize?: number },
  ) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where = {
      hotelId,
      ...(params?.action && { action: { contains: params.action, mode: "insensitive" as const } }),
      ...(params?.entityType && { entityType: params.entityType }),
      ...(params?.userId && { userId: params.userId }),
      ...(params?.dateFrom || params?.dateTo) && {
        createdAt: {
          ...(params?.dateFrom && { gte: params.dateFrom }),
          ...(params?.dateTo && { lte: params.dateTo }),
        },
      },
    };

    const [items, total] = await Promise.all([
      prisma.auditTrail.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, username: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.auditTrail.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },
};
