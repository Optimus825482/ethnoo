# ShuttleCall

Hotel shuttle request application. Next.js app, PostgreSQL, separate background worker.

## Local development

Requirements: Node.js, pnpm, PostgreSQL.

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy
pnpm seed                    # explicit demo/development data; never automatic
pnpm dev
```

Open <http://localhost:3016>. API health: <http://localhost:3016/api/health>. Next.js operations documentation: <https://nextjs.org/docs/app/getting-started/deploying>.

## Notifications

Notifications use standards-based Web Push with VAPID. Firebase/FCM is not used. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_CONTACT_EMAIL`; never commit private keys. Browser permission, HTTPS, and service-worker support are required.

## Runtime topology

```text
Browser
  |
Reverse proxy / TLS
  |
Next.js app :3016 (exactly one replica)
  |                   |
PostgreSQL        Web Push endpoints
  |
Worker (separate process, same image/code)
```

Run the app and worker independently:

```bash
pnpm start
pnpm worker
```

Keep exactly one app replica: session/rate state and SSE delivery are process-local. The worker must be a separate singleton process; do not embed it in every app replica. Add shared coordination before horizontal scaling.

## Operations

```bash
pnpm prisma migrate deploy   # required before startup; no db push fallback
pnpm start                   # application on port 3016
pnpm worker                  # timeout and cleanup jobs
pnpm seed                    # explicit only; development/demo environments
```

Checks:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm coverage:unit
pnpm coverage:frontend
pnpm build
```

Coverage currently reports measured results only; enforce thresholds after establishing a representative baseline, especially for auth and request modules.

Health endpoint: `/api/health`. Public application endpoint: `/`. On failure, inspect app, worker, and PostgreSQL logs separately. Stop rollout when migration fails; restore/rollback using the deployment's database backup procedure before retrying.
