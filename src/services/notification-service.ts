import { prisma } from "@/lib/db";

// Web Push (VAPID) — self-hosted, FCM-free
let webPushModule: any = null;
function getWebPush() {
  if (!webPushModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      webPushModule = require("web-push");
      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webPushModule.setVapidDetails(
          process.env.VAPID_CONTACT_EMAIL || "mailto:admin@shuttlecall.com",
          process.env.VAPID_PUBLIC_KEY,
          process.env.VAPID_PRIVATE_KEY,
        );
      }
    } catch {
      console.warn("[notif] web-push not available");
      return null;
    }
  }
  return webPushModule;
}

// --- Public helpers ---

export function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || "";
}

// --- Send functions ---

export async function sendWebPush(
  subscription: object,
  payload: { title: string; body: string },
): Promise<boolean> {
  const wp = getWebPush();
  if (!wp) return false;

  try {
    await wp.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.warn("[notif] Web Push subscription expired, will clean up");
    } else {
      console.error("[notif] Web Push error:", err.message);
    }
    return false;
  }
}

export async function sendToDrivers(
  hotelId: number,
  payload: { title: string; body: string; type?: string },
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
      notificationType: (payload.type as any) || "NEW_REQUEST",
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
