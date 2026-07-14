import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { Prisma, BuggyStatus } from "@prisma/client";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const BuggyService = {
  async list(hotelId: number, params?: { search?: string; status?: string; isActive?: boolean; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BuggyWhereInput = {
      hotelId,
      ...(params?.isActive !== undefined && { isActive: params.isActive }),
      ...(params?.status && { status: params.status as Prisma.EnumBuggyStatusFilter }),
      ...(params?.search && {
        OR: [
          { code: { contains: params.search, mode: "insensitive" } },
          { model: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.buggy.findMany({
        where,
        include: {
          currentLocation: true,
          drivers: {
            where: { isActive: true },
            include: { driver: { select: { id: true, fullName: true, username: true } } },
          },
        },
        orderBy: [{ code: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.buggy.count({ where }),
    ]);

    // Check driver online status — any assigned driver with active session in last 5 min = online
    const driverIds = items.flatMap((b) => b.drivers.map((d) => d.driver.id));
    const activeSessions = driverIds.length > 0
      ? await prisma.session.findMany({
          where: {
            userId: { in: driverIds },
            isActive: true,
            lastActivity: { gte: new Date(Date.now() - ONLINE_THRESHOLD_MS) },
          },
          select: { userId: true },
          distinct: ["userId"],
        })
      : [];
    const onlineDriverIds = new Set(activeSessions.map((s) => s.userId));

    const mapped = items.map((buggy) => {
      const anyDriverOnline = buggy.drivers.some((d) => onlineDriverIds.has(d.driver.id));
      return {
        ...buggy,
        isOnline: anyDriverOnline,
        // Override status: if AVAILABLE but no driver online → OFFLINE
        status: buggy.status === "AVAILABLE" && !anyDriverOnline ? "OFFLINE" : buggy.status,
      };
    });

    return { items: mapped, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getById(hotelId: number, id: number) {
    const buggy = await prisma.buggy.findFirst({
      where: { id, hotelId },
      include: {
        currentLocation: true,
        drivers: {
          where: { isActive: true },
          include: { driver: { select: { id: true, fullName: true, username: true, phone: true } } },
        },
      },
    });
    if (!buggy) throw new ApiError(404, "Buggy not found", "BUGGY_NOT_FOUND");
    return buggy;
  },

  async create(
    hotelId: number,
    data: { code: string; model?: string; licensePlate?: string; icon?: string; status?: string; currentLocationId?: number; isActive?: boolean },
    userId?: number,
  ) {
    const existing = await prisma.buggy.findUnique({ where: { code: data.code } });
    if (existing) throw new ApiError(409, "Buggy code already exists", "BUGGY_CODE_EXISTS");

    const buggy = await prisma.buggy.create({
      data: {
        hotelId,
        code: data.code,
        model: data.model,
        licensePlate: data.licensePlate,
        icon: data.icon,
        status: (data.status as BuggyStatus) ?? "AVAILABLE",
        currentLocationId: data.currentLocationId,
        isActive: data.isActive ?? true,
      },
    });

    await logAudit({
      hotelId,
      userId,
      action: "CREATE_BUGGY",
      entityType: "Buggy",
      entityId: buggy.id,
      newValues: buggy as unknown as Record<string, unknown>,
    });

    return buggy;
  },

  async update(
    hotelId: number,
    id: number,
    data: Partial<{ code: string; model: string; licensePlate: string; icon: string; status: string; currentLocationId: number | null; isActive: boolean }>,
    userId?: number,
  ) {
    const existing = await this.getById(hotelId, id);

    const buggy = await prisma.buggy.update({
      where: { id },
      data: {
        ...(data.code && { code: data.code }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.licensePlate !== undefined && { licensePlate: data.licensePlate }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.status && { status: data.status as BuggyStatus }),
        ...(data.currentLocationId !== undefined && { currentLocationId: data.currentLocationId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    await logAudit({
      hotelId,
      userId,
      action: "UPDATE_BUGGY",
      entityType: "Buggy",
      entityId: id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: buggy as unknown as Record<string, unknown>,
    });

    return buggy;
  },

  async updateStatus(hotelId: number, id: number, status: string, userId?: number) {
    const existing = await this.getById(hotelId, id);
    const buggy = await prisma.buggy.update({
      where: { id },
      data: { status: status as BuggyStatus },
    });

    await logAudit({
      hotelId,
      userId,
      action: "UPDATE_BUGGY_STATUS",
      entityType: "Buggy",
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: buggy.status },
    });

    return buggy;
  },

  async delete(hotelId: number, id: number, userId?: number) {
    const requestCount = await prisma.buggyRequest.count({
      where: { buggyId: id },
    });

    if (requestCount > 0) {
      const buggy = await prisma.buggy.update({
        where: { id },
        data: { isActive: false, status: "OFFLINE" },
      });
      await logAudit({
        hotelId,
        userId,
        action: "DEACTIVATE_BUGGY",
        entityType: "Buggy",
        entityId: id,
      });
      return { deactivated: true, buggy };
    }

    await prisma.buggy.delete({ where: { id } });
    await logAudit({ hotelId, userId, action: "DELETE_BUGGY", entityType: "Buggy", entityId: id });
    return { deleted: true };
  },

  async assignDriver(hotelId: number, buggyId: number, driverId: number, isPrimary: boolean, userId?: number) {
    // Verify buggy + driver belong to hotel
    const buggy = await prisma.buggy.findFirst({ where: { id: buggyId, hotelId } });
    if (!buggy) throw new ApiError(404, "Buggy not found", "BUGGY_NOT_FOUND");

    const driver = await prisma.user.findFirst({
      where: { id: driverId, hotelId, role: "DRIVER", isActive: true },
    });
    if (!driver) throw new ApiError(404, "Driver not found", "DRIVER_NOT_FOUND");

    // Check if driver already has active buggy (partial unique index)
    const existingAssignment = await prisma.buggyDriver.findFirst({
      where: { driverId, isActive: true },
    });
    if (existingAssignment && existingAssignment.buggyId !== buggyId) {
      throw new ApiError(409, "Driver already assigned to another buggy", "DRIVER_ALREADY_ASSIGNED");
    }

    // If setting as primary, unset other primaries on same buggy
    if (isPrimary) {
      await prisma.buggyDriver.updateMany({
        where: { buggyId, isPrimary: true, isActive: true },
        data: { isPrimary: false },
      });
    }

    // Upsert assignment
    const assignment = await prisma.buggyDriver.upsert({
      where: { buggyId_driverId: { buggyId, driverId } },
      update: { isActive: true, isPrimary, unassignedAt: null },
      create: { buggyId, driverId, isActive: true, isPrimary },
    });

    await logAudit({
      hotelId,
      userId,
      action: "ASSIGN_DRIVER",
      entityType: "BuggyDriver",
      entityId: assignment.id,
      newValues: { buggyId, driverId, isPrimary },
    });

    return assignment;
  },

  async unassignDriver(hotelId: number, buggyId: number, driverId: number, userId?: number) {
    const assignment = await prisma.buggyDriver.findFirst({
      where: { buggyId, driverId, isActive: true },
    });
    if (!assignment) throw new ApiError(404, "Assignment not found", "ASSIGNMENT_NOT_FOUND");

    await prisma.buggyDriver.update({
      where: { id: assignment.id },
      data: { isActive: false, isPrimary: false, unassignedAt: new Date() },
    });

    await logAudit({
      hotelId,
      userId,
      action: "UNASSIGN_DRIVER",
      entityType: "BuggyDriver",
      entityId: assignment.id,
    });

    return { success: true };
  },

  async listDrivers(hotelId: number) {
    return prisma.user.findMany({
      where: { hotelId, role: "DRIVER", isActive: true },
      select: { id: true, fullName: true, username: true, phone: true },
      orderBy: { fullName: "asc" },
    });
  },
};
