import { NextRequest, NextResponse } from "next/server";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { eventBus } from "@/lib/event-bus";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx): Promise<NextResponse> => {
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

      send(JSON.stringify({ type: "connected", role: "admin" }));

      const hotelChannel = `hotel:${ctx.user!.hotelId}`;
      const unsubscribeHotel = eventBus.subscribe(hotelChannel, send);

      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
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
}, { role: "ADMIN" }));
