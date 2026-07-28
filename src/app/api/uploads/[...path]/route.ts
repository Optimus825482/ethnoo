import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

// GET /api/uploads/[...path] — serve runtime-uploaded files
// Next.js standalone does NOT serve public/ files written after build
export const GET = async (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path: segments } = await ctx.params;
  const relPath = segments.join("/");

  // Allow images/locations, images/monitor, images/hotels
  if (!relPath.match(/^images\/(locations|monitor|hotels)\//)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const filePath = join(process.cwd(), "public", relPath);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = relPath.slice(relPath.lastIndexOf(".")).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  const buffer = readFileSync(filePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
};
