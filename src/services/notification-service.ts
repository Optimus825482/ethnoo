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
): Promise<{ sent: boolean; expired: boolean }> {
  const wp = getWebPush();
  if (!wp) return { sent: false, expired: false };

  try {
    await wp.sendNotification(subscription, JSON.stringify(payload));
    return { sent: true, expired: false };
  } catch (error: unknown) {
    if (!isWebPushError(error)) {
      console.error("[notif] Web Push failed with an unknown error");
      return { sent: false, expired: false };
    }
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn("[notif] Web Push subscription expired, cleaning up");
      return { sent: false, expired: true };
    }
    console.error("[notif] Web Push error:", error.message);
    return { sent: false, expired: false };
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

  const results = await Promise.allSettled(
    drivers.map(async (driver) => {
      if (!driver.pushSubscription) return;
      try {
        const sub = JSON.parse(driver.pushSubscription);
        const r = await sendWebPush(sub, { title: payload.title, body: payload.body });
        if (r.expired) {
          await prisma.user.update({
            where: { id: driver.id },
            data: { pushSubscription: null },
          });
        }
      } catch {
        // invalid JSON subscription, clean up
        await prisma.user.update({
          where: { id: driver.id },
          data: { pushSubscription: null },
        }).catch(() => {});
      }
    })
  );

  // Log any failures
  const failed = results.filter(r => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[notif] ${failed} web-push deliveries failed for hotel ${hotelId}`);
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
