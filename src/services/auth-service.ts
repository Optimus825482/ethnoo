import { prisma } from "@/lib/db";
import { hashPassword, comparePassword, createSession, revokeAllUserSessions } from "@/lib/auth";
import { ApiError } from "@/lib/api-response";
import { logAudit } from "@/lib/audit";
import type { AuthContext } from "@/types";

export const AuthService = {
  async login(username: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { hotel: true },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
    }

    if (!user.hotel?.isActive) {
      throw new ApiError(403, "Hotel is inactive", "AUTH_HOTEL_INACTIVE");
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "Invalid credentials", "AUTH_INVALID_CREDENTIALS");
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create new session (regeneration — old sessions stay until expiry)
    const { token, session } = await createSession(user.id, ipAddress, userAgent);

    await logAudit({
      hotelId: user.hotelId,
      userId: user.id,
      action: "LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      token,
      session,
      user: {
        id: user.id,
        hotelId: user.hotelId,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword,
        hotelName: user.hotel.name,
      },
    };
  },

  async logout(ctx: AuthContext, ipAddress?: string) {
    await prisma.session.update({
      where: { id: ctx.session.id },
      data: { isActive: false, revokedAt: new Date() },
    });

    await logAudit({
      hotelId: ctx.user.hotelId,
      userId: ctx.user.id,
      action: "LOGOUT",
      entityType: "User",
      entityId: ctx.user.id,
      ipAddress,
    });
  },

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hotel: { select: { name: true, code: true, timezone: true } } },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "User not found or inactive", "AUTH_USER_INACTIVE");
    }

    return {
      id: user.id,
      hotelId: user.hotelId,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      mustChangePassword: user.mustChangePassword,
      lastLogin: user.lastLogin,
      hotel: user.hotel,
    };
  },

  async changePassword(ctx: AuthContext, currentPassword: string, newPassword: string, email?: string) {
    const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
    if (!user) throw new ApiError(404, "User not found", "USER_NOT_FOUND");

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new ApiError(400, "Current password is incorrect", "AUTH_WRONG_PASSWORD");
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        ...(email ? { email } : {}),
      },
    });

    // Revoke all other sessions
    await revokeAllUserSessions(user.id);

    await logAudit({
      hotelId: ctx.user.hotelId,
      userId: user.id,
      action: "CHANGE_PASSWORD",
      entityType: "User",
      entityId: user.id,
    });
  },
};
