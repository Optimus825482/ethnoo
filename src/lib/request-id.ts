import { randomUUID } from "node:crypto";

const validRequestId = /^[A-Za-z0-9._-]{1,128}$/;

export function requestId(headers: Headers): string {
  const supplied = headers.get("x-request-id");
  return supplied && validRequestId.test(supplied) ? supplied : randomUUID();
}
