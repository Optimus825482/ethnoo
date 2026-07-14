import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { publishSSE } from "@/lib/event-bus";
import { sendToDrivers, sendToGuest } from "@/services/notification-service";
import { Prisma } from "@prisma/client";

export const RequestService = {
  async create(
    hotelId: number,
    data: {
      locationId: number;
      guestName?: string;
      roomNumber?: string;
      hasRoom?: boolean;
      phone?: string;
      notes?: string;
      guestFcmToken?: string;
    },
    ipAddress?: string,
  ) {
    const location = await prisma.location.findFirst({
      where: { id: data.locationId, hotelId, isActive: true },
    });
    if (!location) throw new ApiError(404, "Location not found", "LOCATION_NOT_FOUND");

    const request = await prisma.buggyRequest.create({
      data: {
        hotelId,
        locationId: data.locationId,
        guestName: data.guestName,
        roomNumber: data.roomNumber,
        hasRoom: data.hasRoom ?? true,
        phone: data.phone,
        notes: data.notes,
        guestFcmToken: data.guestFcmToken,
        status: "PENDING",
        requestedAt: new Date(),
      },
      include: { location: true },
    });

    await logAudit({
      hotelId,
      action: "CREATE_REQUEST",
      entityType: "BuggyRequest",
      entityId: request.id,
      ipAddress,
      newValues: { locationId: data.locationId, guestName: data.guestName, status: "PENDING" },
    });

    publishSSE(`hotel:${hotelId}`, { type: "new_request", request });
    publishSSE(`request:${request.id}`, { type: "new_request", request });

    // Push notification to drivers
    sendToDrivers(hotelId, {
      title: "Yeni Talep",
      body: `${data.guestName || "Misafir"} — ${location.name}`,
      type: "NEW_REQUEST",
    }).catch(() => {});

    return request;
  },

  async getById(hotelId: number, id: number) {
    const request = await prisma.buggyRequest.findFirst({
      where: { id, hotelId },
      include: {
        location: true,
        completionLocation: true,
        buggy: { select: { id: true, code: true, icon: true, model: true } },
        acceptedByDriver: { select: { id: true, fullName: true, phone: true } },
      },
    });
    if (!request) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
    return request;
  },

  // Public — guest status polling (no hotelId, limited fields)
  async getByIdPublic(id: number) {
    const request = await prisma.buggyRequest.findFirst({
      where: { id },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        acceptedAt: true,
        completedAt: true,
        location: { select: { name: true } },
        buggy: { select: { code: true, icon: true } },
        acceptedByDriver: { select: { fullName: true } },
      },
    });
    if (!request) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
    return request;
  },

  async list(hotelId: number, params?: {
    status?: string;
    driverId?: number;
    locationId?: number;
    dateFrom?: Date | string;
    dateTo?: Date | string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.BuggyRequestWhereInput = {
      hotelId,
      ...(params?.status && { status: params.status as Prisma.EnumRequestStatusFilter }),
      ...(params?.driverId && { acceptedById: params.driverId }),
      ...(params?.locationId && { locationId: params.locationId }),
      ...(params?.dateFrom || params?.dateTo) && {
        requestedAt: {
          ...(params?.dateFrom && { gte: new Date(params.dateFrom) }),
          ...(params?.dateTo && { lte: new Date(params.dateTo) }),
        },
      },
    };

    const [items, total] = await Promise.all([
      prisma.buggyRequest.findMany({
        where,
        include: {
          location: { select: { id: true, name: true, logo: true } },
          buggy: { select: { id: true, code: true, icon: true } },
          acceptedByDriver: { select: { id: true, fullName: true } },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.buggyRequest.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getActive(hotelId: number) {
    return prisma.buggyRequest.findMany({
      where: {
        hotelId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: {
        location: { select: { id: true, name: true, logo: true } },
        buggy: { select: { id: true, code: true, icon: true, currentLocation: { select: { id: true, name: true, logo: true } } } },
        acceptedByDriver: { select: { id: true, fullName: true } },
      },
      orderBy: { requestedAt: "asc" },
    });
  },

  async accept(hotelId: number, requestId: number, driverId: number) {
    // Get guest FCM token before transaction
    const existingRequest = await prisma.buggyRequest.findUnique({
      where: { id: requestId },
      select: { guestFcmToken: true },
    });
    const guestFcmToken = existingRequest?.guestFcmToken;

    const result = await prisma.$transaction(async (tx) => {
      const requests = await tx.$queryRaw<Array<{ id: number; status: string; hotel_id: number }>>`
        SELECT id, status, hotel_id FROM buggy_requests WHERE id = ${requestId} FOR UPDATE
      `;
      if (!requests[0]) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (requests[0].hotel_id !== hotelId) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (requests[0].status !== "PENDING") {
        throw new ApiError(409, "Request is no longer pending", "REQUEST_NOT_PENDING");
      }

      const assignment = await tx.buggyDriver.findFirst({
        where: { driverId, isActive: true },
        include: { buggy: true },
      });
      if (!assignment) throw new ApiError(400, "No buggy assigned to driver", "NO_BUGGY_ASSIGNED");
      if (assignment.buggy.status !== "AVAILABLE") {
        throw new ApiError(409, "Buggy is not available", "BUGGY_NOT_AVAILABLE");
      }

      const now = new Date();
      const requestRow = await tx.buggyRequest.findUnique({ where: { id: requestId } });
      if (!requestRow) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");

      const responseTime = Math.floor((now.getTime() - requestRow.requestedAt.getTime()) / 1000);

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          acceptedById: driverId,
          buggyId: assignment.buggyId,
          acceptedAt: now,
          responseTime,
        },
      });

      // Set buggy to BUSY and move to pickup location
      await tx.buggy.update({
        where: { id: assignment.buggyId },
        data: { status: "BUSY", currentLocationId: requestRow.locationId },
      });

      await tx.auditTrail.create({
        data: {
          hotelId,
          userId: driverId,
          action: "ACCEPT_REQUEST",
          entityType: "BuggyRequest",
          entityId: requestId,
          newValues: { status: "ACCEPTED", driverId, buggyId: assignment.buggyId, responseTime },
        },
      });

      return updated;
    });

    publishSSE(`request:${requestId}`, { type: "request_accepted", requestId, driverId });
    publishSSE(`hotel:${hotelId}`, { type: "request_accepted", requestId, driverId });

    // Notify guest via FCM
    if (guestFcmToken) {
      sendToGuest(requestId, guestFcmToken, {
        title: "Sürücü Yolda",
        body: "Talebiniz bir sürücü tarafından kabul edildi.",
      }).catch(() => {});
    }

    return result;
  },

  async complete(hotelId: number, requestId: number, driverId: number, completionLocationId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.buggyRequest.findFirst({
        where: { id: requestId, hotelId },
      });
      if (!request) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (request.status !== "ACCEPTED") {
        throw new ApiError(409, "Request is not in accepted state", "REQUEST_NOT_ACCEPTED");
      }
      if (request.acceptedById !== driverId) {
        throw new ApiError(403, "Only the accepting driver can complete", "NOT_ASSIGNED_DRIVER");
      }

      const now = new Date();
      const completionTime = Math.floor((now.getTime() - request.requestedAt.getTime()) / 1000);

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          completionTime,
          completionLocationId,
        },
      });

      if (request.buggyId) {
        // Set buggy to AVAILABLE at drop-off location
        await tx.buggy.update({
          where: { id: request.buggyId },
          data: { status: "AVAILABLE", currentLocationId: completionLocationId ?? request.locationId },
        });
      }

      await tx.auditTrail.create({
        data: {
          hotelId,
          userId: driverId,
          action: "COMPLETE_REQUEST",
          entityType: "BuggyRequest",
          entityId: requestId,
          newValues: { status: "COMPLETED", completionTime },
        },
      });

      return updated;
    });

    publishSSE(`request:${requestId}`, { type: "request_completed", requestId });
    publishSSE(`hotel:${hotelId}`, { type: "request_completed", requestId });
    return result;
  },

  async cancel(
    hotelId: number,
    requestId: number,
    cancelledBy: "DRIVER" | "GUEST" | "ADMIN" | "SYSTEM",
    userId?: number,
    reason?: string,
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.buggyRequest.findFirst({
        where: { id: requestId, hotelId },
      });
      if (!request) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (["COMPLETED", "CANCELLED", "UNANSWERED"].includes(request.status)) {
        throw new ApiError(409, `Cannot cancel request in ${request.status} state`, "REQUEST_NOT_CANCELLABLE");
      }

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledBy,
          cancelledAt: new Date(),
        },
      });

      if (request.buggyId && request.status === "ACCEPTED") {
        await tx.buggy.update({
          where: { id: request.buggyId },
          data: { status: "AVAILABLE" },
        });
      }

      await tx.auditTrail.create({
        data: {
          hotelId,
          userId,
          action: "CANCEL_REQUEST",
          entityType: "BuggyRequest",
          entityId: requestId,
          newValues: { status: "CANCELLED", cancelledBy, reason },
        },
      });

      return updated;
    });

    publishSSE(`request:${requestId}`, { type: "request_cancelled", requestId });
    publishSSE(`hotel:${hotelId}`, { type: "request_cancelled", requestId });
    return result;
  },

  // Public — guest cancels own request (no auth, derives hotelId from request)
  async cancelByGuest(requestId: number) {
    const existing = await prisma.buggyRequest.findUnique({
      where: { id: requestId },
      select: { id: true, hotelId: true, status: true, buggyId: true },
    });
    if (!existing) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
    if (["COMPLETED", "CANCELLED", "UNANSWERED"].includes(existing.status)) {
      throw new ApiError(409, `Cannot cancel request in ${existing.status} state`, "REQUEST_NOT_CANCELLABLE");
    }

    const updated = await prisma.buggyRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        cancelledBy: "GUEST",
        cancelledAt: new Date(),
      },
    });

    if (existing.buggyId && existing.status === "ACCEPTED") {
      await prisma.buggy.update({
        where: { id: existing.buggyId },
        data: { status: "AVAILABLE" },
      });
    }

    publishSSE(`request:${requestId}`, { type: "request_cancelled", requestId });
    publishSSE(`hotel:${existing.hotelId}`, { type: "request_cancelled", requestId });
    return updated;
  },

  async timeoutPending(hotelId?: number) {
    const timeoutThreshold = new Date(Date.now() - 60 * 60 * 1000);

    const result = await prisma.buggyRequest.updateMany({
      where: {
        status: "PENDING",
        requestedAt: { lte: timeoutThreshold },
        ...(hotelId && { hotelId }),
      },
      data: {
        status: "UNANSWERED",
        timeoutAt: new Date(),
      },
    });

    return result.count;
  },
};
