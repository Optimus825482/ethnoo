import { NextResponse } from "next/server";
import { requestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  return NextResponse.json(
    { status: "ok", requestId: id },
    { headers: { "cache-control": "no-store", "x-request-id": id } },
  );
}
