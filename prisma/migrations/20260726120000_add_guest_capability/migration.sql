ALTER TABLE "buggy_requests"
  ADD COLUMN "guest_capability_hash" VARCHAR(64),
  ADD COLUMN "guest_sse_ticket_hash" VARCHAR(64),
  ADD COLUMN "guest_sse_ticket_expires_at" TIMESTAMP(3),
  ADD COLUMN "guest_sse_ticket_used_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "buggy_requests_guest_capability_hash_key" ON "buggy_requests"("guest_capability_hash");
CREATE UNIQUE INDEX "buggy_requests_guest_sse_ticket_hash_key" ON "buggy_requests"("guest_sse_ticket_hash");
