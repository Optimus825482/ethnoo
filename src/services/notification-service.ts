import type { NotificationType } from "@prisma/client";
import WebPush from "web-push";
import { prisma } from "@/lib/db";
import { getEnv } from "@/env";

type PushSubscription = Parameters<typeof WebPush.sendNotification>[0];
function isWebPushError(error: unknown): error is Error & { statusCode?: number } {
  return error instanceof Error;
}

// Web Push (VAPID) — self-hosted, FCM-free
let vapidConfigured = false;
function getWebPush(): typeof WebPush | null {
  if (!vapidConfigured) {
    WebPush.setVapidDetails(
      getEnv().VAPID_CONTACT_EMAIL,
      getEnv().VAPID_PUBLIC_KEY,
      getEnv().VAPID_PRIVATE_KEY,
    );
    vapidConfigured = true;
  }
  return WebPush;
}

// --- Public helpers ---

export function getVapidPublicKey(): string {
  return getEnv().VAPID_PUBLIC_KEY;
}

// --- Send functions ---

export async function sendWebPush(
  subscription: PushSubscription,
  payload: { title: string; body: string },
): Promise<boolean> {
  const wp = getWebPush();
  if (!wp) return false;

  try {
    await wp.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (error: unknown) {
    if (!isWebPushError(error)) {
      console.error("[notif] Web Push failed with an unknown error");
      return false;
    }
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn("[notif] Web Push subscription expired, will clean up");
    } else {
      console.error("[notif] Web Push error:", error.message);
    }
    return false;
  }
}

export async function sendToDrivers(
  hotelId: number,
  payload: { title: string; body: string; type?: NotificationType },
): Promise<void> {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const drivers = await prisma.user.findMany({
    where: {
      hotelId,
      role: "DRIVER",
      isActive: true,
      driverStatus: "ON_DUTY",
      lastHeartbeat: { gte: fiveMinAgo },
    },
    select: { id: true, pushSubscription: true },
  });

  for (const driver of drivers) {
    if (driver.pushSubscription) {
      try {
        const sub = JSON.parse(driver.pushSubscription);
        await sendWebPush(sub, { title: payload.title, body: payload.body });
      } catch {
        // invalid JSON subscription, skip
      }
    }
  }

  // Log notification
  await prisma.notificationLog.create({
    data: {
      hotelId,
      notificationType: payload.type ?? "NEW_REQUEST",
      title: payload.title,
      body: payload.body,
      priority: "HIGH",
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

export async function saveFcmToken(
  userId: number,
  _fcmToken: string,
  pushSubscription?: string,
): Promise<void> {
  // _fcmToken kept for backward compat, only pushSubscription is used now
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(pushSubscription && { pushSubscription }),
    },
  });
}
