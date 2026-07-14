import { NextRequest, NextResponse } from "next/server";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { eventBus } from "@/lib/event-bus";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx): Promise<NextResponse> => {
  const channel = `driver:${ctx.user!.id}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream closed
        }
      };

      // Initial connection event
      send(JSON.stringify({ type: "connected", driverId: ctx.user!.id }));

      // Subscribe to events
      const unsubscribe = eventBus.subscribe(channel, send);

      // Also subscribe to hotel-wide events
      const hotelChannel = `hotel:${ctx.user!.hotelId}`;
      const unsubscribeHotel = eventBus.subscribe(hotelChannel, send);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 30000);

      // Cleanup on abort
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        unsubscribeHotel();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}));
