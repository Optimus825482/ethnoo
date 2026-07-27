import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { publishSSE } from "@/lib/event-bus";
import { sendToDrivers } from "@/services/notification-service";
import { Prisma } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashGuestCapability, matchesGuestCapability, verifyGuestCapability } from "@/lib/guest-capability";

const safeRequestSelect = {
  id: true,
  hotelId: true,
  locationId: true,
  completionLocationId: true,
  buggyId: true,
  acceptedById: true,
  guestName: true,
  roomNumber: true,
  hasRoom: true,
  phone: true,
  notes: true,
  status: true,
  cancelledBy: true,
  requestedAt: true,
  acceptedAt: true,
  completedAt: true,
  cancelledAt: true,
  timeoutAt: true,
  responseTime: true,
  completionTime: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BuggyRequestSelect;

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

    const guestCapability = randomBytes(32).toString("base64url");
    const request = await prisma.buggyRequest.create({
      data: {
        hotelId,
        guestCapabilityHash: hashGuestCapability(guestCapability),
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
      select: { ...safeRequestSelect, location: true },
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

    return { ...request, guestCapability };
  },

  async getById(hotelId: number, id: number) {
    const request = await prisma.buggyRequest.findFirst({
      where: { id, hotelId },
      select: {
        ...safeRequestSelect,
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
  async getByIdPublic(id: number, capability: string | null) {
    if (!(await verifyGuestCapability(id, capability))) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
    const request = await prisma.buggyRequest.findFirst({
      where: { id },
      select: {
        id: true,
        status: true,
        guestName: true,
        roomNumber: true,
        phone: true,
        notes: true,
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
        select: {
          ...safeRequestSelect,
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
      select: {
        ...safeRequestSelect,
        location: { select: { id: true, name: true, logo: true } },
        buggy: { select: { id: true, code: true, icon: true, currentLocation: { select: { id: true, name: true, logo: true } } } },
        acceptedByDriver: { select: { id: true, fullName: true } },
      },
      orderBy: { requestedAt: "asc" },
    });
  },

  async accept(hotelId: number, requestId: number, driverId: number) {
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
      const reserved = await tx.buggy.updateMany({
        where: { id: assignment.buggyId, hotelId, status: "AVAILABLE" },
        data: { status: "BUSY", currentLocationId: requestRow.locationId },
      });
      if (reserved.count !== 1) throw new ApiError(409, "Buggy is not available", "BUGGY_NOT_AVAILABLE");

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "ACCEPTED",
          acceptedById: driverId,
          buggyId: assignment.buggyId,
          acceptedAt: now,
          responseTime,
        },
        select: safeRequestSelect,
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

    return result;
  },

  async complete(hotelId: number, requestId: number, driverId: number, completionLocationId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: number; hotel_id: number; status: string; accepted_by_id: number | null; buggy_id: number | null; requested_at: Date; location_id: number }>>`
        SELECT id, hotel_id, status, accepted_by_id, buggy_id, requested_at, location_id
        FROM buggy_requests WHERE id = ${requestId} FOR UPDATE
      `;
      const request = rows[0];
      if (!request || request.hotel_id !== hotelId) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (request.status !== "ACCEPTED") {
        throw new ApiError(409, "Request is not in accepted state", "REQUEST_NOT_ACCEPTED");
      }
      if (request.accepted_by_id !== driverId) {
        throw new ApiError(403, "Only the accepting driver can complete", "NOT_ASSIGNED_DRIVER");
      }
      if (completionLocationId !== undefined) {
        const location = await tx.location.findFirst({
          where: { id: completionLocationId, hotelId, isActive: true },
          select: { id: true },
        });
        if (!location) throw new ApiError(404, "Location not found", "LOCATION_NOT_FOUND");
      }

      const now = new Date();
      const completionTime = Math.floor((now.getTime() - request.requested_at.getTime()) / 1000);

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          completionTime,
          completionLocationId,
        },
        select: safeRequestSelect,
      });

      if (request.buggy_id) {
        // Set buggy to AVAILABLE at drop-off location
        await tx.buggy.update({
          where: { id: request.buggy_id },
          data: { status: "AVAILABLE", currentLocationId: completionLocationId ?? request.location_id },
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
      const rows = await tx.$queryRaw<Array<{ id: number; hotel_id: number; status: string; buggy_id: number | null; accepted_by_id: number | null }>>`
        SELECT id, hotel_id, status, buggy_id, accepted_by_id FROM buggy_requests WHERE id = ${requestId} FOR UPDATE
      `;
      const request = rows[0];
      if (!request || request.hotel_id !== hotelId) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (["COMPLETED", "CANCELLED", "UNANSWERED"].includes(request.status)) {
        throw new ApiError(409, `Cannot cancel request in ${request.status} state`, "REQUEST_NOT_CANCELLABLE");
      }
      if (cancelledBy === "DRIVER" && request.status === "ACCEPTED" && request.accepted_by_id !== userId) {
        throw new ApiError(403, "Only the accepting driver can cancel", "NOT_ASSIGNED_DRIVER");
      }

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: {
          status: "CANCELLED",
          cancelledBy,
          cancelledAt: new Date(),
        },
        select: safeRequestSelect,
      });

      if (request.buggy_id && request.status === "ACCEPTED") {
        await tx.buggy.update({
          where: { id: request.buggy_id },
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
  async cancelByGuest(requestId: number, capability: string | null) {
    if (!Number.isSafeInteger(requestId) || requestId <= 0) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: number; hotel_id: number; status: string; buggy_id: number | null; guest_capability_hash: string | null }>>`
        SELECT id, hotel_id, status, buggy_id, guest_capability_hash FROM buggy_requests WHERE id = ${requestId} FOR UPDATE
      `;
      const existing = rows[0];
      if (!existing || !matchesGuestCapability(existing.guest_capability_hash, capability)) throw new ApiError(404, "Request not found", "REQUEST_NOT_FOUND");
      if (["COMPLETED", "CANCELLED", "UNANSWERED"].includes(existing.status)) throw new ApiError(409, `Cannot cancel request in ${existing.status} state`, "REQUEST_NOT_CANCELLABLE");

      const updated = await tx.buggyRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED", cancelledBy: "GUEST", cancelledAt: new Date() },
        select: { id: true, hotelId: true, locationId: true, buggyId: true, status: true, cancelledBy: true, requestedAt: true, cancelledAt: true },
      });
      if (existing.buggy_id && existing.status === "ACCEPTED") await tx.buggy.update({ where: { id: existing.buggy_id }, data: { status: "AVAILABLE" } });
      await tx.auditTrail.create({ data: { hotelId: existing.hotel_id, action: "CANCEL_REQUEST", entityType: "BuggyRequest", entityId: requestId, newValues: { status: "CANCELLED", cancelledBy: "GUEST" } } });
      return updated;
    });

    publishSSE(`request:${requestId}`, { type: "request_cancelled", requestId });
    publishSSE(`hotel:${result.hotelId}`, { type: "request_cancelled", requestId });
    return result;
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
