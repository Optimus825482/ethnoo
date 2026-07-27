import { NextRequest, NextResponse } from "next/server";
import { eventBus } from "@/lib/event-bus";
import { consumeGuestSseTicket } from "@/lib/guest-capability";
import { apiError } from "@/lib/api-response";

// Public SSE — guest tracks request status (no auth)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const id = Number(requestId);
  if (!(await consumeGuestSseTicket(id, req.nextUrl.searchParams.get("ticket")))) {
    return apiError("Request not found", 404, "REQUEST_NOT_FOUND");
  }
  const channel = `request:${id}`;

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

      send(JSON.stringify({ type: "connected", requestId: id }));

      const unsubscribe = eventBus.subscribe(channel, send);

      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
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
}
