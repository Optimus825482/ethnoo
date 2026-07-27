import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

export const HOTEL_LOGO_DIR = path.resolve(process.cwd(), "public/images/hotels");
export const HOTEL_LOGO_URL_PREFIX = "/images/hotels/";

export async function storeHotelLogo(base64Data: string): Promise<string> {
  // Parse data URL: data:image/png;base64,XXXX
  const match = base64Data.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!match) throw new Error("Invalid logo format");
  const [, ext, b64] = match;
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length > 500 * 1024) throw new Error("Logo too large (max 500KB)");

  const filename = `hotel-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  await mkdir(HOTEL_LOGO_DIR, { recursive: true });
  await writeFile(path.resolve(HOTEL_LOGO_DIR, filename), buffer);

  return `${HOTEL_LOGO_URL_PREFIX}${filename}`;
}
