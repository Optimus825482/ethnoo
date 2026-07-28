import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, withValidation, toRouteHandler } from "@/lib/middleware";
import { logger } from "@/lib/logger";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const resetSchema = z.object({
  confirm: z.literal("SIFIRLA"),
});

export const POST = toRouteHandler(
  withAuth(
    withValidation(resetSchema, async (_req: NextRequest, ctx) => {
      const adminId = ctx.user!.id;

      logger.warn("System reset initiated", { userId: adminId });

      await prisma.$transaction(async (tx) => {
        // Delete in FK-safe order using Prisma @@map table names
        await tx.$executeRawUnsafe(`DELETE FROM notification_logs`);
        await tx.$executeRawUnsafe(`DELETE FROM buggy_drivers`);
        await tx.$executeRawUnsafe(`DELETE FROM sessions`);
        await tx.$executeRawUnsafe(`DELETE FROM buggy_requests`);
        await tx.$executeRawUnsafe(`DELETE FROM buggies`);
        await tx.$executeRawUnsafe(`DELETE FROM locations`);
        await tx.$executeRawUnsafe(`DELETE FROM audit_trail`);
        await tx.$executeRawUnsafe(`DELETE FROM users`);
        await tx.$executeRawUnsafe(`DELETE FROM system_settings`);
        await tx.$executeRawUnsafe(`DELETE FROM hotels`);
      });

      // Reset all auto-increment sequences so new records start from ID 1
      const sequences = [
        "hotels_id_seq", "users_id_seq", "locations_id_seq",
        "buggies_id_seq", "buggy_drivers_id_seq", "buggy_requests_id_seq",
        "audit_trail_id_seq", "sessions_id_seq",
        "notification_logs_id_seq", "system_settings_id_seq",
      ];
      for (const seq of sequences) {
        await prisma.$executeRawUnsafe(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
      }

      // Clean up uploaded files
      const publicDir = join(process.cwd(), "public");
      try { await rm(join(publicDir, "images", "monitor"), { recursive: true, force: true }); } catch {}
      try { await rm(join(publicDir, "images", "locations"), { recursive: true, force: true }); } catch {}
      try { await rm(join(publicDir, "images", "hotels"), { recursive: true, force: true }); } catch {}
      // Recreate dirs for app to work
      const { mkdir } = await import("node:fs/promises");
      try { await mkdir(join(publicDir, "images", "locations"), { recursive: true }); } catch {}

      logger.warn("System reset completed", { userId: adminId });

      return apiSuccess({ message: "Sistem sıfırlandı. Kurulum sayfasına yönlendiriliyorsunuz." });
    }),
    { role: "ADMIN" },
  ),
);
