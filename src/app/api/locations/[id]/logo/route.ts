import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";
import { deleteLocationLogo, detectImageType, LOCATION_LOGO_URL_PREFIX, MAX_LOGO_BYTES, storeLocationLogo } from "@/lib/location-upload";

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = Number(ctx.params!.id);
    if (!Number.isSafeInteger(id) || id < 1) return apiError("Invalid location", 400, "INVALID_LOCATION");

    const location = await prisma.location.findFirst({ where: { id, hotelId: ctx.user!.hotelId } });
    if (!location) return apiError("Location not found", 404, "LOCATION_NOT_FOUND");

    const value = (await req.formData()).get("logo");
    if (!(value instanceof File)) return apiError("Logo dosyası gerekli", 400, "FILE_REQUIRED");
    if (value.size === 0 || value.size > MAX_LOGO_BYTES) return apiError("Dosya boyutu geçersiz (maks 500KB)", 400, "LOGO_TOO_LARGE");

    const buffer = Buffer.from(await value.arrayBuffer());
    const type = detectImageType(buffer);
    if (!type || value.type !== type.mime) return apiError("Sadece PNG, JPEG veya WebP", 400, "INVALID_TYPE");

    const filename = `location-${id}-${randomBytes(16).toString("hex")}.${type.ext}`;
    await storeLocationLogo(filename, buffer);
    const logoUrl = `${LOCATION_LOGO_URL_PREFIX}${filename}`;

    try {
      await prisma.location.update({ where: { id }, data: { logo: logoUrl } });
    } catch (error) {
      await deleteLocationLogo(logoUrl);
      throw error;
    }
    await deleteLocationLogo(location.logo);

    await logAudit({ hotelId: ctx.user!.hotelId, userId: ctx.user!.id, action: "UPDATE_LOCATION_LOGO", entityType: "Location", entityId: id });
    return apiSuccess({ logo: logoUrl });
  } catch (err) {
    console.error("[logo upload]", err);
    return apiError("Yükleme başarısız", 500, "SERVER_ERROR");
  }
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const id = Number(ctx.params!.id);
    if (!Number.isSafeInteger(id) || id < 1) return apiError("Invalid location", 400, "INVALID_LOCATION");
    const location = await prisma.location.findFirst({ where: { id, hotelId: ctx.user!.hotelId } });
    if (!location) return apiError("Location not found", 404, "LOCATION_NOT_FOUND");

    await prisma.location.update({ where: { id }, data: { logo: null } });
    await deleteLocationLogo(location.logo);
    return apiSuccess({ removed: true });
  } catch (err) {
    console.error("[logo delete]", err);
    return apiError("Silme başarısız", 500, "SERVER_ERROR");
  }
}, { role: "ADMIN" }));
