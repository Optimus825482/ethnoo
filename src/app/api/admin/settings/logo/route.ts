import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const LOGO_DIR = join(process.cwd(), "public", "images", "hotels");
const MAX_BYTES = 500 * 1024; // 500KB

function detectImageType(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "image/webp";
  return null;
}

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return apiError("Expected multipart/form-data", 400, "INVALID_CONTENT_TYPE");
  }

  let formData: FormData;
  try { formData = await req.formData(); } catch { return apiError("Invalid form data", 400, "INVALID_BODY"); }

  const file = formData.get("logo");
  if (!file || !(file instanceof File)) return apiError("No logo file", 400, "MISSING_FILE");
  if (file.size > MAX_BYTES) return apiError("Dosya çok büyük (maks 500KB)", 400, "FILE_TOO_LARGE");

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type) return apiError("Sadece PNG, JPG, WebP", 400, "INVALID_FILE_TYPE");

  const ext = type.split("/")[1];
  const filename = `hotel-${Date.now()}-${ext}.${ext === "jpeg" ? "jpg" : ext}`;
  await mkdir(LOGO_DIR, { recursive: true });
  await writeFile(join(LOGO_DIR, filename), buffer);

  const url = `/api/uploads/images/hotels/${filename}`;

  await prisma.hotel.update({
    where: { id: ctx.user!.hotelId },
    data: { logo: url },
  });

  await logAudit({ hotelId: ctx.user!.hotelId, userId: ctx.user!.id, action: "UPLOAD_HOTEL_LOGO", entityType: "Hotel" });

  return apiSuccess({ url, message: "Logo yüklendi" });
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const hotel = await prisma.hotel.findUnique({ where: { id: ctx.user!.hotelId }, select: { logo: true } });
  if (hotel?.logo) {
    const p = hotel.logo.replace("/api/uploads/images/hotels/", "");
    try { await unlink(join(LOGO_DIR, p)); } catch { /* file may not exist */ }
  }

  await prisma.hotel.update({ where: { id: ctx.user!.hotelId }, data: { logo: null } });
  await logAudit({ hotelId: ctx.user!.hotelId, userId: ctx.user!.id, action: "DELETE_HOTEL_LOGO", entityType: "Hotel" });
  return apiSuccess({ message: "Logo silindi" });
}, { role: "ADMIN" }));
