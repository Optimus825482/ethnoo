import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";
import { passwordSchema } from "@/schemas/password";
import { getEnv } from "@/env";
import { withRateLimit, toRouteHandler } from "@/lib/middleware";

// GET — authenticated setup state check
export async function GET(req: NextRequest) {
  if (!secretsMatch(req.headers.get("x-setup-secret") ?? "", getEnv().SETUP_SECRET)) {
    return apiError("Invalid setup credentials", 401, "INVALID_SETUP_SECRET");
  }

  const hotelCount = await prisma.hotel.count();
  const userCount = await prisma.user.count();
  return apiSuccess({
    setupRequired: hotelCount === 0 || userCount === 0,
    hotelCount,
    userCount,
  });
}

const setupSchema = z.object({
  hotelName: z.string().min(1).max(255),
  hotelCode: z.string().min(1).max(20),
  timezone: z.string().default("Europe/Istanbul"),
  adminUsername: z.string().min(1).max(50),
  adminPassword: passwordSchema,
  adminFullName: z.string().min(1).max(255),
  adminEmail: z.string().email().optional(),
  setupSecret: z.string().min(1),
  hotelLogo: z.string().optional(),
});

function secretsMatch(provided: string, expected: string) {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

class SetupCompletedError extends Error {}

// POST — execute initial setup
async function handleSetup(req: NextRequest) {
  try {
    const body = await req.json();
    const data = setupSchema.parse(body);
    if (!secretsMatch(data.setupSecret, getEnv().SETUP_SECRET)) {
      return apiError("Invalid setup credentials", 401, "INVALID_SETUP_SECRET");
    }

    // Serializable isolation makes the in-transaction recheck exclusive under concurrency.
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.hotel.count();
      if (existing > 0) {
        throw new SetupCompletedError();
      }

      // Store logo if provided
      let logoUrl: string | null = null;
      if (data.hotelLogo) {
        const { storeHotelLogo } = await import("@/lib/hotel-upload");
        try { logoUrl = await storeHotelLogo(data.hotelLogo); } catch { /* use null */ }
      }

      const hotel = await tx.hotel.create({
        data: {
          name: data.hotelName,
          code: data.hotelCode,
          logo: logoUrl,
          timezone: data.timezone,
          setupCompleted: true,
          isActive: true,
        },
      });

      const passwordHash = await hashPassword(data.adminPassword);
      const admin = await tx.user.create({
        data: {
          hotelId: hotel.id,
          username: data.adminUsername,
          passwordHash,
          role: "ADMIN",
          fullName: data.adminFullName,
          email: data.adminEmail,
          isActive: true,
          mustChangePassword: false,
        },
      });

      return { hotel, admin };
    }, { isolationLevel: "Serializable" });

    return apiSuccess({
      hotel: { id: result.hotel.id, name: result.hotel.name, code: result.hotel.code },
      admin: { id: result.admin.id, username: result.admin.username },
      message: "Setup completed. You can now login.",
    }, 201);
  } catch (err) {
    if (
      err instanceof SetupCompletedError ||
      (["P2002", "P2034"].includes((err as { code?: string }).code ?? "") &&
        await prisma.hotel.count() > 0)
    ) {
      return apiError("System is already set up", 409, "ALREADY_SETUP");
    }
    if (err instanceof z.ZodError) {
      return apiError(err.issues[0]?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    console.error("[setup]", err);
    return apiError("Setup failed", 500, "SETUP_FAILED");
  }
}

export const POST = toRouteHandler(withRateLimit(
  "setup",
  { limit: 5, window: 15 * 60 },
  (req) => handleSetup(req),
));
