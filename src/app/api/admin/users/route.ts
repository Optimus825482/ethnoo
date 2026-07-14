import { NextRequest } from "next/server";
import { createUserSchema, userQuerySchema } from "@/schemas/user";
import { prisma } from "@/lib/db";
import { apiSuccess, apiError, ApiError } from "@/lib/api-response";
import { withAuth, withRateLimit, toRouteHandler } from "@/lib/middleware";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx) => {
  const url = new URL(req.url);
  const params = userQuerySchema.parse({
    search: url.searchParams.get("search") || undefined,
    role: url.searchParams.get("role") || undefined,
    isActive: url.searchParams.get("isActive") || undefined,
    page: url.searchParams.get("page") || "1",
    pageSize: url.searchParams.get("pageSize") || "50",
  });

  const where = {
    hotelId: ctx.user!.hotelId,
    ...(params.role && { role: params.role as "ADMIN" | "DRIVER" }),
    ...(params.search && {
      OR: [
        { username: { contains: params.search, mode: "insensitive" as const } },
        { fullName: { contains: params.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 50;

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, username: true, role: true, fullName: true,
        email: true, phone: true, isActive: true, mustChangePassword: true,
        lastLogin: true, createdAt: true,
      },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}));

export const POST = toRouteHandler(
  withRateLimit(
    "create-user",
    { limit: 10, window: 60 },
    withAuth(async (req: NextRequest, ctx) => {
      try {
        const body = await req.json();
        const result = createUserSchema.safeParse(body);
        if (!result.success) {
          const err = result.error.issues[0];
          return apiError(err?.message || "Validation failed", 400, "VALIDATION_ERROR");
        }
        const data = result.data;

        const existing = await prisma.user.findUnique({ where: { username: data.username } });
        if (existing) throw new ApiError(409, "Username already exists", "USER_EXISTS");

        const passwordHash = await hashPassword(data.password);
        const user = await prisma.user.create({
          data: {
            hotelId: ctx.user!.hotelId,
            username: data.username,
            passwordHash,
            role: data.role,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            mustChangePassword: true,
          },
          select: { id: true, username: true, role: true, fullName: true },
        });

        await logAudit({
          hotelId: ctx.user!.hotelId,
          userId: ctx.user!.id,
          action: "CREATE_USER",
          entityType: "User",
          entityId: user.id,
          newValues: { username: user.username, role: user.role },
        });

        return apiSuccess(user, 201);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode || 500;
        return apiError(err instanceof Error ? err.message : "Failed", status);
      }
    }),
  ),
);
