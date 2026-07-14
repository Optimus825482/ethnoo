import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";

// POST /api/locations/[id]/logo — upload logo image
export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  try {
    const id = Number(ctx.params!.id);

    const location = await prisma.location.findFirst({
      where: { id, hotelId: ctx.user!.hotelId },
    });
    if (!location) return apiError("Location not found", 404, "LOCATION_NOT_FOUND");

    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file) return apiError("Logo dosyası gerekli", 400, "FILE_REQUIRED");

    if (file.size > 500 * 1024) {
      return apiError("Dosya çok büyük (maks 500KB)", 400, "LOGO_TOO_LARGE");
    }
    if (!file.type.startsWith("image/")) {
      return apiError("Sadece resim dosyası", 400, "INVALID_TYPE");
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const ext = file.name.split(".").pop() || "png";
    const filename = `location-${id}-${Date.now()}.${ext}`;
    const uploadDir = "public/images/locations";
    const filePath = `${uploadDir}/${filename}`;

    // Ensure directory exists
    const fs = require("fs");
    const path = require("path");
    const dir = path.join(process.cwd(), uploadDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(path.join(process.cwd(), filePath), buffer);

    const logoUrl = `/images/locations/${filename}`;

    // Update DB
    await prisma.location.update({
      where: { id },
      data: { logo: logoUrl },
    });

    await logAudit({
      hotelId: ctx.user!.hotelId,
      userId: ctx.user!.id,
      action: "UPDATE_LOCATION_LOGO",
      entityType: "Location",
      entityId: id,
    });

    return apiSuccess({ logo: logoUrl });
  } catch (err: any) {
    console.error("[logo upload]", err);
    return apiError(err.message || "Yükleme başarısız", 500, "SERVER_ERROR");
  }
}));

// DELETE /api/locations/[id]/logo — remove logo
export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    const id = Number(ctx.params!.id);
    const location = await prisma.location.findFirst({
      where: { id, hotelId: ctx.user!.hotelId },
    });
    if (!location) return apiError("Location not found", 404, "LOCATION_NOT_FOUND");

    // Delete file if exists
    if (location.logo && location.logo.startsWith("/images/")) {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.join(process.cwd(), "public", location.logo);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.location.update({
      where: { id },
      data: { logo: null },
    });

    return apiSuccess({ removed: true });
  } catch (err) {
    console.error("[logo delete]", err);
    return apiError("Silme başarısız", 500, "SERVER_ERROR");
  }
}));
