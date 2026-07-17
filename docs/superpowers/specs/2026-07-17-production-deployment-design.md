# ShuttleCall Production Deployment Design

**Date:** 2026-07-17
**Goal:** Deploy ShuttleCall to Docker server with `https://shuttlecall.com`, coexisting with existing minibar app — zero disruption.

## Server Context

- Docker installed, ~7.75 GB RAM
- `coolify-proxy` (Traefik v3.6) on ports 80/443 — Coolify itself NOT installed
- `minibar-app` + `minibar-postgres` + `minibar-redis` running behind Traefik
- Constraint: **do not touch minibar files, config, or SSL**

## Traefik Config (verified via `docker inspect`)

- Image: `traefik:v3.6`
- Entrypoints: `http` (:80), `https` (:443)
- Docker provider: `--providers.docker=true`, `--providers.docker.exposedbydefault=false`
- Cert resolver: `letsencrypt` (TLS-ALPN-01 challenge)
- Network: `coolify` (external)

## Architecture

```
Internet → Traefik (coolify-proxy, :80/:443)
                ├── Host(minibar-domain) → minibar-app  [UNCHANGED]
                └── Host(shuttlecall.com) → shuttlecall-app:3016  [NEW]
                                                ↓
                                         shuttlecall-db:5432 (internal)
```

## Changes Made

### 1. `docker-compose.yaml`

- Removed `ports: "3016:3016"` — Traefik routes internally via Docker network
- Added `coolify` external network + `default` network (app on both, db on default only)
- Added Traefik labels:
  - `traefik.enable=true` (required — `exposedbydefault=false`)
  - `traefik.docker.network=coolify` (specify which network Traefik uses)
  - `Host(shuttlecall.com)` on `https` entrypoint with `letsencrypt` cert resolver
  - HTTP→HTTPS permanent redirect on `http` entrypoint
  - `loadbalancer.server.port=3016`
- Changed domain: `shuttle.erkanerdem.online` → `shuttlecall.com`
- Secrets: hardcoded → `${VAR}` references (read from `.env.production`)
- Added `FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY}` (was empty)

### 2. `.env.production` (gitignored — real secrets)

- `DB_PASSWORD` — generated strong password
- `NEXTAUTH_SECRET` — generated 32-byte base64 secret
- Firebase keys — from existing `.env`
- VAPID keys — from existing `.env`

### 3. `.env.production.example` (committed — template)

- Placeholder values for documentation

### 4. `.gitignore`

- Added `!.env.production.example` exception

## Deployment Steps (on server)

```bash
git clone https://github.com/Optimus825482/shuttle.git
cd shuttle
# Create .env.production with real values (see .env.production.example)
nano .env.production
# Deploy
docker compose --env-file .env.production up -d --build
# Check Traefik picked up the route
docker logs coolify-proxy --tail 20
```

## Risk Assessment

- **minibar disruption: NONE** — no files/config touched, Traefik auto-discovers new container
- **SSL: Traefik handles Let's Encrypt via TLS-ALPN-01** — works on :443, Traefik already there
- **Resource: ~200-400 MB additional RAM** (PostgreSQL + Next.js) — server has ~7.75 GB, plenty
- **Port conflict: NONE** — app container doesn't expose host ports, Traefik handles routing
