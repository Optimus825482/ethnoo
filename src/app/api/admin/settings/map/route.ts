import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { logAudit } from "@/lib/audit";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const MAP_DIR = join(process.cwd(), "public", "images", "monitor");
const MAP_PATH = join(MAP_DIR, "map.jpg");
const MAP_URL = "/api/uploads/images/monitor/map.jpg";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function detectImageType(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "image/webp";
  return null;
}

export const POST = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return apiError("Expected multipart/form-data", 400, "INVALID_CONTENT_TYPE");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data", 400, "INVALID_BODY");
  }

  const file = formData.get("map");
  if (!file || !(file instanceof File)) {
    return apiError("No map file provided", 400, "MISSING_FILE");
  }

  if (file.size > MAX_BYTES) {
    return apiError("Dosya çok büyük (maks 5MB)", 400, "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type) {
    return apiError("Sadece PNG, JPG, WebP dosyaları kabul edilir", 400, "INVALID_FILE_TYPE");
  }

  try {
    await mkdir(MAP_DIR, { recursive: true });
    await writeFile(MAP_PATH, buffer);
  } catch {
    return apiError("Harita kaydedilemedi", 500, "FILE_WRITE_ERROR");
  }

  await prisma.systemSetting.upsert({
    where: { hotelId_key: { hotelId: ctx.user!.hotelId, key: "monitor_map_url" } },
    update: { value: MAP_URL },
    create: { hotelId: ctx.user!.hotelId, key: "monitor_map_url", value: MAP_URL },
  });

  await logAudit({
    hotelId: ctx.user!.hotelId,
    userId: ctx.user!.id,
    action: "UPLOAD_MONITOR_MAP",
    entityType: "SystemSetting",
  });

  return apiSuccess({ url: MAP_URL, message: "Harita yüklendi" });
}, { role: "ADMIN" }));

export const DELETE = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  try {
    await unlink(MAP_PATH);
  } catch {
    // file may not exist
  }

  await prisma.systemSetting.upsert({
    where: { hotelId_key: { hotelId: ctx.user!.hotelId, key: "monitor_map_url" } },
    update: { value: "" },
    create: { hotelId: ctx.user!.hotelId, key: "monitor_map_url", value: "" },
  });

  await logAudit({
    hotelId: ctx.user!.hotelId,
    userId: ctx.user!.id,
    action: "DELETE_MONITOR_MAP",
    entityType: "SystemSetting",
  });

  return apiSuccess({ message: "Harita silindi" });
}, { role: "ADMIN" }));
