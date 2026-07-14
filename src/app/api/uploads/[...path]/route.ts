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

// GET /api/uploads/[...path] — serve uploaded files from public directory
export const GET = async (req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path: segments } = await ctx.params;
  const relPath = segments.join("/");

  // Only allow images/locations prefix
  if (!relPath.startsWith("images/locations/")) {
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
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
};
