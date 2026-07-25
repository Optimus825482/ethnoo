// Background worker process — run with: pnpm worker
// ponytail: upgrade to BullMQ + Redis when scaling to multiple instances

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import cron from "node-cron";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Timeout worker — every 60s, mark PENDING requests older than 1 hour as UNANSWERED
cron.schedule("* * * * *", async () => {
  try {
    const timeoutThreshold = new Date(Date.now() - 60 * 60 * 1000);
    const result = await prisma.buggyRequest.updateMany({
      where: {
        status: "PENDING",
        requestedAt: { lte: timeoutThreshold },
      },
      data: {
        status: "UNANSWERED",
        timeoutAt: new Date(),
      },
    });
    if (result.count > 0) {
      console.log(`[timeout] ${result.count} requests marked as UNANSWERED`);
    }
  } catch (err) {
    console.error("[timeout] Error:", err);
  }
});

// Auto OFF_DUTY — every 60s, mark drivers w/o heartbeat for 5+ min as OFF_DUTY
cron.schedule("* * * * *", async () => {
  try {
    const threshold = new Date(Date.now() - 5 * 60 * 1000);
    const result = await prisma.user.updateMany({
      where: {
        role: "DRIVER",
        driverStatus: "ON_DUTY",
        isActive: true,
        OR: [
          { lastHeartbeat: { lt: threshold } },
          { lastHeartbeat: null },
        ],
      },
      data: { driverStatus: "OFF_DUTY" },
    });
    if (result.count > 0) {
      console.log(`[off_duty] ${result.count} drivers marked OFF_DUTY (heartbeat timeout)`);
    }
  } catch (err) {
    console.error("[off_duty] Error:", err);
  }
});

// Session cleanup — every hour, mark expired sessions as inactive
cron.schedule("0 * * * *", async () => {
  try {
    const result = await prisma.session.updateMany({
      where: {
        isActive: true,
        expiresAt: { lt: new Date() },
      },
      data: { isActive: false },
    });
    if (result.count > 0) {
      console.log(`[cleanup] ${result.count} expired sessions deactivated`);
    }
  } catch (err) {
    console.error("[cleanup] Error:", err);
  }
});

// Notification log cleanup — daily at 3am, archive logs older than 90 days
cron.schedule("0 3 * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await prisma.notificationLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      console.log(`[cleanup] ${result.count} old notification logs deleted`);
    }
  } catch (err) {
    console.error("[cleanup] Notification logs error:", err);
  }
});

console.log("[worker] Background jobs started:");
console.log("  - timeout: every 60s");
console.log("  - session cleanup: every hour");
console.log("  - notification log cleanup: daily at 3am");
