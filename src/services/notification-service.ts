import { prisma } from "@/lib/db";

// FCM (Firebase Cloud Messaging)
let firebaseApp: any = null;
function getFirebaseApp() {
  if (!firebaseApp) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require("firebase-admin");
      if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
          }),
        });
      }
      firebaseApp = admin;
    } catch {
      console.warn("[notif] Firebase not configured, FCM disabled");
      return null;
    }
  }
  return firebaseApp;
}

// Web Push (VAPID)
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

export async function sendFCM(
  token: string,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<boolean> {
  const admin = getFirebaseApp();
  if (!admin) return false;

  try {
    await admin.messaging().send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: payload.data || {},
    });
    return true;
  } catch (err: any) {
    // Token invalid — mark for cleanup
    if (err.code === "messaging/registration-token-not-registered") {
      console.warn("[notif] FCM token not registered, will clean up");
    } else {
      console.error("[notif] FCM send error:", err.message);
    }
    return false;
  }
}

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
  const drivers = await prisma.user.findMany({
    where: { hotelId, role: "DRIVER", isActive: true },
    select: { id: true, fcmToken: true, pushSubscription: true },
  });

  for (const driver of drivers) {
    if (driver.fcmToken) {
      await sendFCM(driver.fcmToken, {
        title: payload.title,
        body: payload.body,
        data: { type: payload.type || "general", hotelId: String(hotelId) },
      });
    }
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

export async function sendToGuest(
  requestId: number,
  fcmToken: string | null | undefined,
  payload: { title: string; body: string },
): Promise<void> {
  if (!fcmToken) return;

  const sent = await sendFCM(fcmToken, {
    title: payload.title,
    body: payload.body,
    data: { requestId: String(requestId) },
  });

  if (!sent) return;

  await prisma.notificationLog.create({
    data: {
      hotelId: 0, // will be filled by caller
      requestId,
      notificationType: "REQUEST_ACCEPTED",
      title: payload.title,
      body: payload.body,
      priority: "NORMAL",
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

export async function saveFcmToken(
  userId: number,
  fcmToken: string,
  pushSubscription?: string,
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      fcmToken,
      fcmTokenDate: new Date(),
      ...(pushSubscription && { pushSubscription }),
    },
  });
}
