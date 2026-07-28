import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, withValidation, toRouteHandler } from "@/lib/middleware";
import { logger } from "@/lib/logger";

const resetSchema = z.object({
  confirm: z.literal("SIFIRLA"),
});

export const POST = toRouteHandler(
  withAuth(
    withValidation(resetSchema, async (_req: NextRequest, ctx) => {
      const adminId = ctx.user!.id;
      const adminUsername = ctx.user!.username;

      logger.warn("System reset initiated", { userId: adminId, username: adminUsername });

      await prisma.$transaction(async (tx) => {
        // Delete in FK-safe order:
        // 1. Tables that reference other tables
        await tx.$executeRawUnsafe(`DELETE FROM "NotificationLog"`);
        await tx.$executeRawUnsafe(`DELETE FROM "BuggyDriver"`);
        await tx.$executeRawUnsafe(`DELETE FROM "Session"`);
        await tx.$executeRawUnsafe(`DELETE FROM "BuggyRequest"`);
        // 2. Tables with FK to Location
        await tx.$executeRawUnsafe(`DELETE FROM "Buggy"`);
        // 3. Location
        await tx.$executeRawUnsafe(`DELETE FROM "Location"`);
        // 4. Tables with Restrict FK to Hotel
        await tx.$executeRawUnsafe(`DELETE FROM "AuditTrail"`);
        // 5. Tables with Cascade FK to Hotel
        await tx.$executeRawUnsafe(`DELETE FROM "User"`);
        await tx.$executeRawUnsafe(`DELETE FROM "SystemSetting"`);
        // 6. Root table
        await tx.$executeRawUnsafe(`DELETE FROM "Hotel"`);
      });

      logger.warn("System reset completed", { userId: adminId });

      return apiSuccess({ message: "Sistem sıfırlandı. Kurulum sayfasına yönlendiriliyorsunuz." });
    }),
    { role: "ADMIN" },
  ),
);
