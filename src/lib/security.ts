/**
 * Security headers as a plain object (key → value).
 * Suitable for reference, documentation, or custom middleware.
 */
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
};

/**
 * Returns the header array shape expected by `next.config.ts` `headers()`.
 *
 * @example
 * // next.config.ts
 * import { nextConfigSecurityHeaders } from "@/lib/security";
 * const nextConfig = { headers: () => nextConfigSecurityHeaders() };
 */
export function nextConfigSecurityHeaders(): Array<{
  source: string;
  headers: Array<{ key: string; value: string }>;
}> {
  return [
    {
      source: "/(.*)",
      headers: Object.entries(securityHeaders).map(([key, value]) => ({
        key,
        value,
      })),
    },
  ];
}
