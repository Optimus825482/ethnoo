import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_LOGO_BYTES = 500 * 1024;
export const LOCATION_UPLOAD_DIR = path.resolve(process.cwd(), "public/images/locations");
export const LOCATION_LOGO_URL_PREFIX = "/api/uploads/images/locations/";

const TYPES = [
  { ext: "png", mime: "image/png", matches: (b: Buffer) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", matches: (b: Buffer) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", mime: "image/webp", matches: (b: Buffer) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
] as const;

export function detectImageType(buffer: Buffer) {
  return TYPES.find((type) => type.matches(buffer));
}

export function locationLogoPath(filename: string): string {
  if (!/^location-\d+-[a-f0-9]{32}\.(png|jpg|webp)$/.test(filename)) throw new Error("Invalid logo path");
  const target = path.resolve(LOCATION_UPLOAD_DIR, filename);
  if (path.dirname(target) !== LOCATION_UPLOAD_DIR) throw new Error("Invalid logo path");
  return target;
}

export function filenameFromLogoUrl(url: string | null): string | null {
  if (!url?.startsWith(LOCATION_LOGO_URL_PREFIX)) return null;
  const filename = url.slice(LOCATION_LOGO_URL_PREFIX.length);
  return filename.includes("/") ? null : filename;
}

export async function storeLocationLogo(filename: string, buffer: Buffer): Promise<void> {
  await mkdir(LOCATION_UPLOAD_DIR, { recursive: true });
  await writeFile(locationLogoPath(filename), buffer, { flag: "wx" });
}

export async function readLocationLogo(filename: string): Promise<Buffer> {
  return readFile(locationLogoPath(filename));
}

export async function deleteLocationLogo(url: string | null): Promise<void> {
  const filename = filenameFromLogoUrl(url);
  if (!filename) return;
  await rm(locationLogoPath(filename), { force: true });
}
