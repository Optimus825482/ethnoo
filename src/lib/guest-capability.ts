import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";

export function hashGuestCapability(capability: string): string {
  return createHash("sha256").update(capability).digest("hex");
}

export function matchesGuestCapability(hash: string | null, capability: string | null): boolean {
  if (!hash || !capability || !/^[A-Za-z0-9_-]{43}$/.test(capability)) return false;
  return timingSafeEqual(Buffer.from(hashGuestCapability(capability), "hex"), Buffer.from(hash, "hex"));
}

export async function verifyGuestCapability(requestId: number, capability: string | null): Promise<boolean> {
  if (!Number.isSafeInteger(requestId) || requestId <= 0 || !capability || !/^[A-Za-z0-9_-]{43}$/.test(capability)) return false;
  const request = await prisma.buggyRequest.findUnique({
    where: { id: requestId },
    select: { guestCapabilityHash: true },
  });
  return matchesGuestCapability(request?.guestCapabilityHash ?? null, capability);
}

export async function issueGuestSseTicket(requestId: number, capability: string | null) {
  if (!(await verifyGuestCapability(requestId, capability))) return null;
  const ticket = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 60_000);
  await prisma.buggyRequest.update({
    where: { id: requestId },
    data: { guestSseTicketHash: hashGuestCapability(ticket), guestSseTicketExpiresAt: expiresAt, guestSseTicketUsedAt: null },
  });
  return { ticket, expiresAt };
}

export async function consumeGuestSseTicket(requestId: number, ticket: string | null): Promise<boolean> {
  if (!Number.isSafeInteger(requestId) || requestId <= 0 || !ticket || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return false;
  const result = await prisma.buggyRequest.updateMany({
    where: {
      id: requestId,
      guestSseTicketHash: hashGuestCapability(ticket),
      guestSseTicketExpiresAt: { gt: new Date() },
      guestSseTicketUsedAt: null,
    },
    data: { guestSseTicketUsedAt: new Date() },
  });
  return result.count === 1;
}
