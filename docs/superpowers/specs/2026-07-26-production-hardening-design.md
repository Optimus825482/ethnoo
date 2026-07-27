# ShuttleCall Production Hardening Design

**Date:** 2026-07-26
**Status:** Approved design
**Repository:** `D:\ETHNO\shuttlecall`

## Goal

Close every verified audit finding without discarding or reverting the existing dirty working tree. Prioritize security and data integrity, preserve current behavior except where insecure, then restore automated quality gates and production operability.

## Constraints

- Work in the current `feat/admin-monitor` branch.
- Preserve all existing modified, deleted, and untracked user files.
- Never run reset, clean, checkout-overwrite, blanket formatting, or broad generated rewrites.
- Inspect each target before editing; merge with current user work.
- Firebase stays removed. Remove only stale Firebase environment, deployment, test, and documentation references.
- Web Push/VAPID remains the notification mechanism.
- Avoid Redis until multi-instance deployment is required. Enforce/document one application replica meanwhile.
- Do not invent performance gains. Measure before adding indexes or render memoization.
- Do not commit or push without explicit user authorization.

## Delivery Strategy

Implement in narrow phases. Each phase leaves runnable verification. Stop and diagnose at the first regression; do not hide failures by weakening tests or lint rules.

## Phase 1: Security and Data Integrity

### Admin authorization

All `/api/admin/**` handlers and audit endpoints require an authenticated `ADMIN` role at the server boundary. UI redirects remain convenience only. Add negative tests proving `DRIVER` receives `403`.

### Guest request capability

Request creation generates a cryptographically secure capability token with at least 128 bits of entropy. Return the raw token once to the guest client; store only its SHA-256 hash. Guest status, SSE, and cancellation require the token. Invalid or absent capability returns `404` to avoid record enumeration. An invalid authenticated session returns `401`, never anonymous fallback.

Existing guest pages persist the capability only for the request lifecycle. No global account system is added.

### Deployment safety

Remove `prisma db push --accept-data-loss` fallback. Migration failure terminates startup. Remove automatic seed execution from the application entrypoint. Demo seed remains an explicit development command. Add a bounded database wait timeout.

### Setup protection and password policy

Protect first-run setup with a deployment-provided one-time secret. Disable setup after initialization. Use one shared password schema for setup, create-user, change-password, and reset flows. Minimum policy follows the existing tests: eight or more characters containing uppercase, lowercase, digit, and special character.

### Upload hardening

Accept only PNG, JPEG, and WebP. Validate content signatures rather than trusting multipart MIME or filename. Generate server-controlled filenames and extensions. Reject SVG and active formats. Add `nosniff`; serve static content where possible. Store one canonical relative path and make deletion use the same representation.

### Dependencies and secrets

Upgrade Next.js and `eslint-config-next` to a patched compatible release, minimum `16.2.11`. Upgrade `next-auth` to at least `5.0.0-beta.32` only if it remains installed/used; otherwise remove it. Keep the lockfile deterministic.

Remove stale Firebase variables, compose wiring, mocks, and active documentation. Replace VAPID example values with placeholders. Active VAPID rotation is an operational action and must be confirmed separately; code must reject placeholders in production.

### Rate limiting

Do not trust arbitrary `X-Forwarded-For`. Use the verified proxy-derived client address policy. Bound in-memory keys and expire them. Document and enforce single-replica operation until a shared limiter/event transport is introduced.

## Phase 2: Tests and Quality Gates

- Restore all backend tests.
- Restore all frontend tests and eliminate unhandled test errors.
- Add `typecheck`, `test:unit`, and `test:frontend`; make `test` run both suites.
- Eliminate all ESLint errors without disabling rules globally.
- Add route-level integration tests for login/session, admin role denial, guest capability status/SSE/cancel, setup protection, and upload rejection.
- Add one browser smoke flow only if an existing browser test tool is available. Otherwise document it as a follow-up rather than adding a heavy dependency solely for one test.
- Add coverage reporting. Start with measured reporting; enforce thresholds only for critical auth/request modules after observing the baseline.

## Phase 3: Production Operations

### Runtime topology

Run the existing worker as a separate service from the same immutable image. Add restart and health behavior. Keep one app replica unless shared SSE and rate limiting are implemented.

### Health and environment

Add application container healthcheck. Separate liveness from readiness. Readiness verifies database connectivity and expected schema state without mutating data.

Create one server-side Zod environment schema. Validate required URLs, database connection, setup secret, auth/session secret, and VAPID settings at startup. Reject placeholders in production. Remove unused Firebase fields and conflicting hard-coded domains.

### Observability and errors

Add structured JSON server logging using the smallest existing/native solution. Propagate a request/correlation ID. Record server errors without returning internals. The global error UI shows a stable generic message plus a support digest. Define basic health signals: HTTP 5xx rate, p95 latency, DB errors, and active SSE connections. External vendor integration remains optional until credentials/provider are chosen.

### Reproducibility and recovery

Pin the exact pnpm version in `packageManager` and Docker. Add CI for frozen install, typecheck, lint, both test suites, and build. Produce images only after all gates pass. Document DB/upload backup, restore test, rollback, migration failure, and secret rotation.

## Phase 4: Performance

Apply verified low-risk fixes first:

- Remove duplicate report summary request.
- Stop returning report request rows unused by the UI.
- Collapse report aggregation queries when equivalent behavior is proven by tests.
- Delete empty SSE event channels after unsubscribe.
- Replace synchronous upload request I/O with static serving or asynchronous access.
- Use immutable caching only for content-addressed filenames.

Add the composite `hotelId/status/requestedAt` index only after an `EXPLAIN (ANALYZE, BUFFERS)` comparison confirms benefit on representative data. Isolate the monitor clock from map rendering before considering memoization. Lazy-load Recharts only if route bundle analysis confirms meaningful savings. Remove only proven-unreferenced public assets; preserve current user image work.

## Phase 5: UI and Accessibility

All UI changes follow the animation decision framework and preserve current visual identity.

| Before | After | Why |
| --- | --- | --- |
| Guest confirmation built from plain `div` | Existing accessible `Dialog` with title, Escape, focus trap, initial/return focus | Correct keyboard and screen-reader modal semantics |
| Click-only map picker and simulation cards | Semantic buttons/links, keyboard input, visible focus; coordinate fallback for picker | Complete non-pointer operation |
| Unconditional repeated motion | `prefers-reduced-motion` alternatives; remove decorative infinite motion | Respect motion sensitivity |
| Low-contrast pending text | AA-compliant darker status color plus non-color cue | Ensure readable status |
| Unnamed switches/selects | Visible labels or `aria-labelledby`; correct `htmlFor`/`id` | Expose control purpose |
| `transition-all` | Explicit color, transform, opacity, or shadow transitions | Predictable performant motion |
| 400 ms overshooting modal | 180–250 ms `ease-out`, subtle opacity/translate | Faster task-focused response |
| Ungated hover motion | Hover-capable fine-pointer media gating | Avoid sticky touch behavior |
| Silent loading/SSE updates | `aria-live`, `role="status"`, and `aria-busy` | Announce async state changes |
| Missing guest landmarks/headings | `main`, `h1`, and structured sections | Improve document navigation |

Keyboard-triggered actions remain instant. Common transitions stay below 300 ms. Reduced motion keeps essential state feedback while removing decorative movement.

## Phase 6: Focused Architecture Cleanup

- Make middleware use one session-validation implementation.
- Make the worker call the shared request-timeout service instead of duplicating transition logic.
- Replace enum and notification `any` casts with typed inputs at service boundaries.
- Remove verified dead bindings first.
- Extract heartbeat, GPS, and push lifecycle hooks from the driver dashboard only where this directly resolves existing lint/effect defects.
- Do not introduce factories, interfaces, or event abstractions with one implementation.

## Verification

Required final checks:

1. `pnpm install --frozen-lockfile` or equivalent deterministic install validation.
2. `pnpm typecheck`.
3. `pnpm lint` with zero errors.
4. `pnpm test:unit` with zero failures.
5. `pnpm test:frontend` with zero failures and zero unhandled errors.
6. Security-focused integration tests.
7. `pnpm build`.
8. `pnpm audit --prod`; any remaining advisory documented with applicability and mitigation.
9. Docker configuration validation and non-mutating startup review.
10. Manual keyboard/reduced-motion smoke check for modified guest/admin flows.

## Acceptance Criteria

- No server admin operation is available to `DRIVER`.
- Guest request data, SSE, and cancellation require an unguessable capability.
- Startup never accepts schema data loss and never seeds production automatically.
- Setup is not remotely claimable without a deployment secret.
- Active uploads cannot store SVG/HTML or spoofed image content.
- Firebase is absent from runtime, dependencies, deployment wiring, and active tests.
- VAPID examples contain no private key material.
- Patched framework/auth dependencies are used or unused dependencies removed.
- Build, typecheck, lint, backend tests, and frontend tests all pass.
- Worker, healthcheck, env validation, CI, recovery documentation, and baseline observability exist.
- Verified report/SSE/upload performance defects are fixed; speculative tuning is measurement-gated.
- Critical guest UI flows are keyboard-accessible and respect reduced motion.
- Existing user changes and untracked assets are preserved.

## Explicit Non-Goals

- No Firebase reintroduction.
- No Redis deployment until multi-replica operation is required.
- No monitoring vendor, object store, or E2E framework added without existing support or a demonstrated need.
- No wholesale rewrite, broad formatting, or unrelated component redesign.
- No automatic secret rotation, production deployment, commit, or push without separate authorization.
