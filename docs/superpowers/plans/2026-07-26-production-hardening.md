# ShuttleCall Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all verified security, data-integrity, test, production, performance, accessibility, and maintainability findings while preserving the current dirty working tree.

**Architecture:** Six ordered delivery phases. Security boundaries and data safety land first; tests become hard gates; runtime operations follow; only measured performance work is applied; UI accessibility uses existing primitives; final cleanup removes duplication without broad rewrites. Firebase remains absent. Web Push/VAPID remains. App stays single-replica; Redis is not introduced.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL 16, Zod, Vitest, Testing Library, Tailwind CSS 4, Docker Compose, Traefik, Web Push/VAPID.

---

## Global Safety Rules

- [ ] Capture `git status --short --branch` and `git diff --name-status` before edits.
- [ ] Before each target edit, inspect `git diff -- <path>` and merge rather than overwrite.
- [ ] Never use `git reset`, `git clean`, overwrite checkout, blanket formatting, or `git add .`.
- [ ] Preserve existing deleted/untracked location images and current auth/admin work.
- [ ] Stop at the first failed gate; diagnose rather than weakening tests or lint rules.
- [ ] Do not commit or push without separate explicit authorization.

## Phase 1 — Security and Data Integrity

### Task 1: Enforce server-side ADMIN authorization

**Files:** `src/lib/middleware.ts`; all `src/app/api/admin/**/route.ts`; `src/app/api/audit/route.ts`; `src/app/api/monitor/state/route.ts`; `src/app/api/reports/{summary,performance}/route.ts`; `src/app/api/sse/admin/route.ts`; privileged buggy/location routes; create `tests/admin-authorization.test.ts`.

- [ ] Write a data-driven failing test proving a valid `DRIVER` session receives `403` from every privileged route, no session receives `401`, and `ADMIN` proceeds past authorization.
- [ ] Run `pnpm exec vitest run tests/admin-authorization.test.ts`; expect authorization failures.
- [ ] Apply `withAuth(handler, { role: "ADMIN" })` at each route boundary. Do not rely on layouts/proxy redirects.
- [ ] Re-run the focused test; expect all cases to pass.

### Task 2: Add guest request capability storage

**Files:** modify `prisma/schema.prisma`, `src/services/request-service.ts`, `src/app/api/requests/route.ts`; create `prisma/migrations/<timestamp>_add_guest_capability_hash/migration.sql`, `tests/guest-capability.test.ts`.

- [ ] Write a failing test: request creation returns one raw cryptographically random token; Prisma receives only its 64-character SHA-256 hash; raw token never enters stored data/log payloads.
- [ ] Add nullable `guestCapabilityHash String? @unique @db.VarChar(64)` to `BuggyRequest` for migration compatibility.
- [ ] Generate at least 128 bits using `randomBytes(32).toString("base64url")`; hash with SHA-256; return raw token only in create response.
- [ ] Run focused tests plus `pnpm exec prisma validate`; expect pass.

### Task 3: Protect guest status, SSE, and cancellation

**Files:** `src/app/api/requests/[id]/route.ts`, `src/app/api/requests/[id]/cancel/route.ts`, `src/app/api/sse/guest/[requestId]/route.ts`, `src/services/request-service.ts`, `src/lib/security.ts`, `tests/guest-capability.test.ts`.

- [ ] Add failing cases: correct capability succeeds; absent/wrong/other-request capability returns `404`; malformed ID also returns non-enumerating `404`; invalid session cookie returns `401` rather than anonymous fallback.
- [ ] Add one constant-time capability verifier that hashes candidate input and compares against stored hash.
- [ ] Reuse it in status, SSE, and cancel routes. Never emit token in audit/SSE/log records.
- [ ] Run `pnpm exec vitest run tests/guest-capability.test.ts`; expect pass.

### Task 4: Carry capability through the guest UI

**Files:** `src/app/(guest)/guest/call/page.tsx`, `src/app/(guest)/guest/status/[requestId]/page.tsx`, guest frontend tests.

- [ ] Write failing tests: create response token is stored under a request-ID-scoped `sessionStorage` key; status fetch, cancel, and SSE use it; terminal state clears it; no cookie/localStorage use.
- [ ] Implement request-scoped storage. For EventSource, pass the capability only to its dedicated URL query because custom headers are unavailable; set/refine strict referrer policy and avoid rendering/logging the URL.
- [ ] Preserve current navigation and terminal-state behavior.
- [ ] Run the focused frontend tests; expect pass and no unhandled errors.

### Task 5: Centralize password policy

**Files:** create `src/schemas/password.ts`; modify `src/schemas/auth.ts`, `src/schemas/user.ts`, `src/app/api/setup/route.ts`, `src/app/api/auth/change-password/route.ts`, `src/services/auth-service.ts`, `tests/schemas.test.ts`.

- [ ] Keep existing tests requiring 8+ characters, uppercase, lowercase, digit, and special character; add endpoint matrix tests.
- [ ] Export one shared Zod password schema and import it in setup, create-user, change-password, and reset flows.
- [ ] Remove conflicting `min(4)`/`min(6)` definitions.
- [ ] Run `pnpm exec vitest run tests/schemas.test.ts`; expect all 174-unit baseline tests to recover.

### Task 6: Protect first-run setup

**Files:** `src/app/api/setup/route.ts`, `src/app/(setup)/setup/page.tsx`, `.env.example`, `.env.production.example`; create `tests/setup-security.test.ts`.

- [ ] Write failing tests: missing/wrong secret is rejected without revealing setup state; correct secret works only while setup is required; concurrent requests create one first admin; secret never appears in logs/responses.
- [ ] Require `SETUP_SECRET`; compare safely; recheck initialization inside the admin-creation transaction.
- [ ] Disable setup after the first successful initialization.
- [ ] Run focused tests; expect pass.

### Task 7: Harden uploads and canonicalize paths

**Files:** `src/app/api/locations/[id]/logo/route.ts`, `src/app/api/uploads/[...path]/route.ts`, `src/services/location-service.ts`, `next.config.ts`; create `tests/upload-security.test.ts`.

- [ ] Add buffer fixtures proving valid PNG/JPEG/WebP pass; SVG, HTML, spoofed MIME, oversized files, unsupported signatures, and traversal fail.
- [ ] Implement small stdlib magic-byte checks. Generate server filenames/extensions; never use client filename extension.
- [ ] Store one canonical relative path. Make deletion use the same path representation.
- [ ] Add `X-Content-Type-Options: nosniff`; reject SVG/GIF.
- [ ] Run focused tests; expect pass.

### Task 8: Make startup fail safely

**Files:** `docker-entrypoint.sh`, `prisma/seed.ts`, `package.json`.

- [ ] Add a shell-level check proving DB wait has a maximum attempt count, migration failure exits non-zero, and startup contains neither `db push --accept-data-loss` nor automatic seed.
- [ ] Remove fallback and entrypoint seed. Keep `pnpm seed` as an explicit development operation.
- [ ] Run `bash -n docker-entrypoint.sh` and static assertions; expect pass.

### Task 9: Bound rate limiting and client-address trust

**Files:** create `src/lib/client-address.ts`, `tests/client-address.test.ts`; modify `src/lib/middleware.ts`, Traefik/compose configuration if needed.

- [ ] Write failing tests proving arbitrary `X-Forwarded-For` cannot select rate keys; entries expire; key count is bounded; restart/single-process limitation is explicit.
- [ ] Implement one verified proxy-address policy. If deployment cannot prove a trusted header, do not claim spoof-resistant IP identity.
- [ ] Add expiry cleanup and a hard map-size ceiling. Keep one app replica; do not add Redis.
- [ ] Run focused tests; expect pass.

### Task 10: Patch dependencies and remove Firebase remnants

**Files:** `package.json`, `pnpm-lock.yaml`, `.env.example`, `.env.production.example`, `docker-compose.yaml`, `tests/notification-service.test.ts`, active deployment docs.

- [ ] Verify real package usage before modification.
- [ ] Upgrade `next` and `eslint-config-next` to the same patched release, minimum `16.2.11`; upgrade used `next-auth` to `>=5.0.0-beta.32`, otherwise remove unused auth packages.
- [ ] Remove Firebase env/compose/test-mock/runtime references. Keep Web Push/VAPID.
- [ ] Replace VAPID examples with `CHANGE_ME` placeholders; do not rotate active keys automatically.
- [ ] Run frozen install, package listing, production audit, and `git grep -n -i firebase`; expect no active Firebase references or committed private key blocks.

## Phase 2 — Tests and Quality Gates

### Task 11: Define deterministic scripts

**Files:** `package.json`, `vitest.config.ts`, `vitest.frontend.config.ts`.

- [ ] Add `typecheck`, `test:unit`, `test:frontend`; make `test` execute both.
- [ ] Ensure `.test.ts` and `.test.tsx` suites remain correctly isolated.
- [ ] Run each script independently; expect deterministic discovery.

### Task 12: Restore backend and frontend suites

**Files:** current failing source/tests, especially `tests/admin-dashboard.test.tsx`, `tests/driver-dashboard.test.tsx`, `tests/guest-call-page.test.tsx`.

- [ ] Run unit tests; fix first failure only; repeat until zero failures.
- [ ] Run frontend tests; fix first real exception, timer/EventSource/fetch cleanup, and `act` issues; repeat until zero failures and zero unhandled errors.
- [ ] Never weaken assertions merely to match insecure behavior.

### Task 13: Add route integration coverage

**Files:** create `tests/routes/auth-routes.test.ts`, `admin-routes.test.ts`, `guest-routes.test.ts`, `setup-route.test.ts`, `upload-route.test.ts`.

- [ ] Test login/logout/session expiry and inactive principals.
- [ ] Test ADMIN/DRIVER route boundaries.
- [ ] Test create/status/SSE/cancel capability flow.
- [ ] Test setup secret/concurrency and upload spoof rejection.
- [ ] Run `pnpm exec vitest run tests/routes`; expect pass.

### Task 14: Eliminate lint errors

**Files:** only files reported by `pnpm lint`.

- [ ] Fix one file at a time: explicit `any`, forbidden `require`, render-time ref writes, effect state issues, dead bindings.
- [ ] Avoid global rule disables and broad formatting.
- [ ] Run lint after each file; final expectation: zero errors.

### Task 15: Establish coverage baseline

**Files:** Vitest configs, `package.json`; official Vitest coverage provider only if absent.

- [ ] Generate unit and frontend coverage reports.
- [ ] Record measured baseline; do not invent a percentage.
- [ ] Add thresholds only to critical auth/request/capability modules at or below observed baseline.
- [ ] Do not add an E2E framework solely for one smoke test; retain a manual smoke checklist.

## Phase 3 — Production Operations

### Task 16: Pin toolchain and validate environment

**Files:** `package.json`, `Dockerfile`; create `src/env.ts`, `tests/env.test.ts`; modify env consumers.

- [ ] Pin exact pnpm in `packageManager` and every Docker stage.
- [ ] Write tests rejecting absent/invalid URLs, DB/session/setup/VAPID secrets, and production placeholders; Firebase fields must not exist.
- [ ] Implement one server-only Zod env schema and replace scattered direct reads.
- [ ] Run env tests and frozen install.

### Task 17: Separate liveness/readiness and add healthchecks

**Files:** create `src/app/api/health/live/route.ts`, `ready/route.ts`, `tests/health.test.ts`; modify current health route, Dockerfile, compose.

- [ ] Test: live stays `200` when DB is down; ready becomes `503`; readiness checks DB/schema without mutation.
- [ ] Add container/app healthchecks with timeout/retry/start-period.
- [ ] Preserve `/api/health` compatibility as readiness alias or documented deprecated endpoint.

### Task 18: Run worker as a separate service

**Files:** `docker-compose.yaml`, `Dockerfile`, `src/workers/index.ts`, operations docs.

- [ ] Add same-image worker service, no published HTTP port, proper restart policy and DB health dependency.
- [ ] Verify worker command exists in runner image.
- [ ] Explicitly document/enforce one app replica.
- [ ] Run `docker compose config` and image smoke validation.

### Task 19: Add native structured logging and request IDs

**Files:** create `src/lib/logger.ts`, `request-id.ts`, tests; modify API error handling, `src/app/error.tsx`, SSE tracking.

- [ ] Test parseable JSON fields, request ID/digest, and redaction of password/session/capability/VAPID values.
- [ ] Implement small native serializer; no logging dependency.
- [ ] Return generic client errors with support digest; keep internals server-side.
- [ ] Log request duration/status, DB errors, and SSE open/close count.

### Task 20: Add CI and recovery documentation

**Files:** create `.github/workflows/ci.yml`, `docs/operations/{deployment,backup-restore,rollback,secret-rotation,observability}.md`; update README.

- [ ] CI order: exact pnpm, frozen install, Prisma generate, typecheck, lint, unit, frontend, build, audit, Docker validation.
- [ ] Do not deploy/publish without separately configured credentials and authorization.
- [ ] Document DB/upload backup and restore test, migration failure rollback, setup/session/VAPID rotation, single-replica limit, worker, health endpoints.
- [ ] Do not invent RPO/RTO; mark them as operator decisions.

## Phase 4 — Verified Performance Fixes

### Task 21: Remove duplicate report work

**Files:** `src/app/(admin)/admin/reports/page.tsx`, `src/services/report-service.ts`, report routes; create report tests.

- [ ] Test one summary call on mount/filter and absence of unused `requests` payload.
- [ ] Remove duplicate call and unused rows.
- [ ] Add golden fixtures, then collapse equivalent aggregations while preserving null/rounding semantics.
- [ ] Prove query count decreases; run focused tests.

### Task 22: Clean SSE channels and upload I/O

**Files:** `src/lib/event-bus.ts`, its tests, upload route/config.

- [ ] Test last-unsubscribe deletion and multi-subscriber preservation.
- [ ] Delete empty channel sets.
- [ ] Remove request-path synchronous FS; prefer static serving. Apply immutable cache only to server-generated immutable filenames.

### Task 23: Gate speculative optimization on measurement

**Files:** monitor/report components, Prisma schema; create measurement SQL only as needed.

- [ ] Compare representative `EXPLAIN (ANALYZE, BUFFERS)` before adding `(hotelId,status,requestedAt)` index. No evidence means no migration.
- [ ] Profile 15-second clock ticks; first isolate clock state from map. Add no blanket memoization.
- [ ] Measure reports route bundle; dynamic-import Recharts only if meaningful.
- [ ] List unreferenced assets, but delete none without separate explicit approval; preserve user images.

## Phase 5 — UI and Accessibility

### Task 24: Fix guest semantics and dialog

**Files:** guest call/status pages, existing `src/components/ui/dialog.tsx`; create accessibility tests.

- [ ] Test one `main`, meaningful `h1`, accessible dialog title/description, Escape, focus trap, initial/return focus.
- [ ] Replace plain modal with existing Dialog primitive.
- [ ] Use 180–250ms `ease-out`, subtle opacity/translate, no overshoot.

### Task 25: Announce loading and live status

**Files:** guest pages/loading components.

- [ ] Test `aria-busy`, `role="status"`, polite live updates, and duplicate-announcement suppression.
- [ ] Implement semantic state announcements while preserving visible status.

### Task 26: Respect reduced motion and explicit transitions

**Files:** `src/app/globals.css`, modified guest/admin components, tests.

- [ ] Add reduced-motion tests/contract.
- [ ] Disable decorative float/pulse/ripple/infinite motion under reduced motion; retain essential static/short-opacity feedback.
- [ ] Replace touched `transition-all` usages with explicit properties; gate hover transforms behind `(hover: hover) and (pointer: fine)`.

### Task 27: Fix keyboard controls, labels, and contrast

**Files:** map picker, simulate/settings pages, switch/select uses.

- [ ] Make map points keyboard-operable and add labeled numeric coordinate fallback.
- [ ] Make simulation cards one semantic interactive element; avoid nested controls.
- [ ] Link every switch/select to visible label using exact `id/htmlFor` or `aria-labelledby`.
- [ ] Use AA-compliant pending text plus non-color cue.
- [ ] Run frontend/accessibility tests and manual keyboard/reduced-motion smoke.

## Phase 6 — Focused Architecture, Docs, Final Verification

### Task 28: Deduplicate session and timeout logic

**Files:** `src/lib/auth.ts`, `src/lib/middleware.ts`, `src/services/request-service.ts`, `src/workers/index.ts`, tests.

- [ ] Test identical expiry/inactive/revoked outcomes through validator and middleware.
- [ ] Make middleware call the single validator; preserve required activity-touch semantics.
- [ ] Test worker delegation; make worker call `RequestService.timeoutPending()` rather than duplicate transition logic.

### Task 29: Restore type safety and remove proven dead code

**Files:** request/buggy/notification services, shared types, driver dashboard.

- [ ] Replace enum/notification/Recharts `any` casts with typed service inputs and Zod trust-boundary validation.
- [ ] Remove only lint/TypeScript/grep-proven dead bindings.
- [ ] For driver heartbeat/GPS/push effects, fix inline first. Extract a focused hook only if it directly resolves multiple lifecycle defects; no speculative three-hook rewrite.

### Task 30: Consolidate active documentation

**Files:** README, operations docs, old deployment design.

- [ ] Document port 3016, pnpm, env, explicit seed, migrations, worker, single replica, Web Push/VAPID, guest capability, health, tests, deploy, backup/restore, rollback.
- [ ] Mark Firebase-era deployment design superseded rather than deleting history.

### Task 31: Preserve dirty tree and run final gates

- [ ] Compare final status/name-status with initial snapshot; verify user files and untracked images remain.
- [ ] Run, stopping at first failure:

```bash
pnpm install --frozen-lockfile
pnpm exec prisma validate
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:frontend
pnpm exec vitest run tests/routes tests/admin-authorization.test.ts tests/guest-capability.test.ts tests/setup-security.test.ts tests/upload-security.test.ts
pnpm build
pnpm audit --prod
docker compose config
docker build --target runner -t shuttlecall:production-verification .
git diff --check
git status --short --branch
```

- [ ] Document every remaining advisory with package/version, reachability, patched version, and mitigation; add no audit ignore solely to obtain green output.
- [ ] Perform manual Tab/Shift+Tab/Enter/Space/Escape, 200% zoom, 320px viewport, reduced-motion, and screen-reader smoke checks.
- [ ] Do not commit or push unless the user separately authorizes it.

## Final Acceptance

- [ ] DRIVER cannot execute any admin operation.
- [ ] Guest status/SSE/cancel require an unguessable request capability.
- [ ] Invalid session never becomes anonymous authorization.
- [ ] Startup never accepts data loss or seeds production automatically.
- [ ] Setup is secret-protected and closes after initialization.
- [ ] Spoofed/active uploads are rejected.
- [ ] Firebase is absent from runtime/deploy/tests; VAPID examples contain no private key.
- [ ] Patched dependencies are installed.
- [ ] Typecheck, lint, unit, frontend, integration, build, Docker validation pass.
- [ ] Worker, health, env validation, CI, logging, and recovery docs exist.
- [ ] Verified performance defects are fixed; speculative changes remain measurement-gated.
- [ ] Critical guest/admin UI is keyboard-accessible and reduced-motion aware.
- [ ] Initial user modifications and assets remain intact.
