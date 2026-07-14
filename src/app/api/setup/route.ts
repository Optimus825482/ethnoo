import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { hashPassword } from "@/lib/auth";

// GET — check if setup is needed (any hotel exists?)
export async function GET() {
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
	  adminPassword: z.string().min(4, "En az 4 karakter"),
  adminFullName: z.string().min(1).max(255),
  adminEmail: z.string().email().optional(),
});

// POST — execute initial setup
export async function POST(req: NextRequest) {
  try {
    // Check if already set up
    const existing = await prisma.hotel.count();
    if (existing > 0) {
      return apiError("System is already set up", 400, "ALREADY_SETUP");
    }

    const body = await req.json();
    const data = setupSchema.parse(body);

    // Create hotel + admin in transaction
    const result = await prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: data.hotelName,
          code: data.hotelCode,
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
    });

    return apiSuccess({
      hotel: { id: result.hotel.id, name: result.hotel.name, code: result.hotel.code },
      admin: { id: result.admin.id, username: result.admin.username },
      message: "Setup completed. You can now login.",
    }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError(err.issues[0]?.message || "Validation failed", 400, "VALIDATION_ERROR");
    }
    console.error("[setup]", err);
    return apiError("Setup failed", 500, "SETUP_FAILED");
  }
}
