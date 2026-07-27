import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorDigest, logger } from "@/lib/logger";
import { requestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const rows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public._prisma_migrations')::text AS table_name
    `;
    if (!rows[0]?.table_name) throw new Error("schema migrations table missing");
    return NextResponse.json({ status: "ready", requestId: id }, { headers: headers(id) });
  } catch (error) {
    const digest = errorDigest(error);
    logger.error("readiness check failed", { requestId: id, digest, error });
    return NextResponse.json(
      { status: "not_ready", requestId: id, digest },
      { status: 503, headers: headers(id) },
    );
  }
}

function headers(id: string) {
  return { "cache-control": "no-store", "x-request-id": id };
}
