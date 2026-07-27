import { createHash } from "node:crypto";

const sensitive = /authorization|cookie|password|secret|token|key|email|phone/i;
type Fields = Record<string, unknown>;

function redact(value: unknown, key = ""): unknown {
  if (sensitive.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]),
    );
  }
  return value;
}

export function errorDigest(error: unknown): string {
  const message = error instanceof Error ? `${error.name}:${error.message}` : String(error);
  return createHash("sha256").update(message).digest("hex").slice(0, 16);
}

function write(level: "info" | "warn" | "error", message: string, fields: Fields = {}) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...redact(fields) as Fields });
  (level === "info" ? console.log : level === "warn" ? console.warn : console.error)(line);
}

export const logger = {
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};
