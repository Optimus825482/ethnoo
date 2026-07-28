import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import { Prisma } from "@prisma/client";
import { deleteLocationLogo } from "@/lib/location-upload";

export const LocationService = {
  async list(hotelId: number, params?: { search?: string; isActive?: boolean; page?: number; pageSize?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.LocationWhereInput = {
      hotelId,
      ...(params?.isActive !== undefined && { isActive: params.isActive }),
      ...(params?.search && {
        OR: [
          { name: { contains: params.search, mode: "insensitive" } },
          { description: { contains: params.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.location.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  async getById(hotelId: number, id: number) {
    const location = await prisma.location.findFirst({
      where: { id, hotelId },
    });
    if (!location) throw new ApiError(404, "Location not found", "LOCATION_NOT_FOUND");
    return location;
  },

  async create(
    hotelId: number,
    data: { name: string; description?: string; logo?: string; latitude?: number; longitude?: number; mapX?: number; mapY?: number; displayOrder?: number; isActive?: boolean },
    userId?: number,
  ) {
    const location = await prisma.location.create({
      data: {
        hotelId,
        name: data.name,
        description: data.description,
        logo: data.logo,
        latitude: data.latitude,
        longitude: data.longitude,
        mapX: data.mapX,
        mapY: data.mapY,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    await logAudit({
      hotelId,
      userId,
      action: "CREATE_LOCATION",
      entityType: "Location",
      entityId: location.id,
      newValues: location as unknown as Record<string, unknown>,
    });

    // Auto-generate QR code
    try {
      const qrData = JSON.stringify({
        type: "shuttlecall",
        hotelId,
        locationId: location.id,
        name: location.name,
      });
      await prisma.location.update({
        where: { id: location.id },
        data: { qrCodeData: qrData },
      });
    } catch { /* QR non-critical */ }

    return location;
  },

  async update(
    hotelId: number,
    id: number,
    data: Partial<{ name: string; description: string; logo: string | null; latitude: number; longitude: number; mapX: number | null; mapY: number | null; displayOrder: number; isActive: boolean }>,
    userId?: number,
  ) {
    const existing = await this.getById(hotelId, id);

    const location = await prisma.location.update({
      where: { id },
      data,
    });

    await logAudit({
      hotelId,
      userId,
      action: "UPDATE_LOCATION",
      entityType: "Location",
      entityId: id,
      oldValues: existing as unknown as Record<string, unknown>,
      newValues: location as unknown as Record<string, unknown>,
    });

    return location;
  },

  async delete(hotelId: number, id: number, userId?: number) {
    // Check for dependent requests
    const requestCount = await prisma.buggyRequest.count({
      where: { locationId: id },
    });

    if (requestCount > 0) {
      // Soft delete instead
      const location = await prisma.location.update({
        where: { id },
        data: { isActive: false },
      });
      await logAudit({
        hotelId,
        userId,
        action: "DEACTIVATE_LOCATION",
        entityType: "Location",
        entityId: id,
        newValues: { isActive: false },
      });
      return { deactivated: true, location };
    }

    const location = await this.getById(hotelId, id);
    await prisma.location.delete({ where: { id } });
    await deleteLocationLogo(location.logo);
    await logAudit({
      hotelId,
      userId,
      action: "DELETE_LOCATION",
      entityType: "Location",
      entityId: id,
    });
    return { deleted: true };
  },

  async generateQR(hotelId: number, id: number, userId?: number) {
    const location = await this.getById(hotelId, id);
    const qrData = JSON.stringify({
      type: "shuttlecall",
      hotelId,
      locationId: id,
      name: location.name,
    });

    const updated = await prisma.location.update({
      where: { id },
      data: { qrCodeData: qrData },
    });

    await logAudit({
      hotelId,
      userId,
      action: "GENERATE_QR",
      entityType: "Location",
      entityId: id,
    });

    return updated;
  },

  async clearQR(hotelId: number, id: number, userId?: number) {
    await this.getById(hotelId, id);
    const updated = await prisma.location.update({
      where: { id },
      data: { qrCodeData: null },
    });
    await logAudit({
      hotelId,
      userId,
      action: "DELETE_QR",
      entityType: "Location",
      entityId: id,
    });
    return updated;
  },
};
