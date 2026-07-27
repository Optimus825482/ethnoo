import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/utils";
import bcrypt from "bcryptjs";
import { getEnv } from "@/env";

const SESSION_DURATION_HOURS = 24;
const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;

export interface SessionUser {
  id: number;
  hotelId: number;
  username: string;
  role: "ADMIN" | "DRIVER";
  fullName: string;
  isActive: boolean;
  driverStatus: "ON_DUTY" | "OFF_DUTY";
}

export interface SessionInfo {
  id: number;
  tokenHash: string;
  expiresAt: Date;
}

export interface ValidatedSession {
  user: SessionUser;
  session: SessionInfo;
}

export async function createSession(
  userId: number,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ token: string; session: SessionInfo }> {
  const token = generateToken(32);
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await prisma.session.create({
    data: {
      userId,
      tokenHash,
      ipAddress,
      userAgent,
      isActive: true,
      expiresAt,
    },
  });

  return {
    token,
    session: {
      id: session.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    },
  };
}

export async function validateSession(
  token: string,
  options: { allowInactive?: boolean } = {},
): Promise<ValidatedSession | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          hotelId: true,
          username: true,
          role: true,
          fullName: true,
          isActive: true,
          driverStatus: true,
          hotel: { select: { isActive: true } },
        },
      },
    },
  });

  if (!session || !session.isActive || session.expiresAt < new Date()) {
    return null;
  }
  if (!options.allowInactive && (!session.user.isActive || !session.user.hotel?.isActive)) {
    return null;
  }

  return {
    user: {
      id: session.user.id,
      hotelId: session.user.hotelId,
      username: session.user.username,
      role: session.user.role,
      fullName: session.user.fullName,
      isActive: session.user.isActive,
      driverStatus: session.user.driverStatus,
    },
    session: {
      id: session.id,
      tokenHash: session.tokenHash,
      expiresAt: session.expiresAt,
    },
  };
}

export async function revokeSession(sessionId: number): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, revokedAt: new Date() },
  });
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    maxAge: SESSION_DURATION_MS / 1000,
    path: "/",
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set("session_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
