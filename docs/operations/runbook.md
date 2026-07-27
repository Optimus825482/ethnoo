# Operations runbook

Run commands from the deployment host in the project directory. Set `BACKUP` to an operator-approved protected path.

## Operator decision record

- Operator:
- Timestamp / change ID:
- Current image digest:
- Target image digest:
- Backup path and checksum:
- Expected migration:
- Acceptable outage / blast radius:
- Rollback trigger:
- Decision: proceed / abort / rollback

## Backup

```sh
mkdir -p "$BACKUP"
docker compose exec -T db pg_dump -U postgres -d shuttlecall -Fc > "$BACKUP/shuttlecall-$(date +%Y%m%dT%H%M%S).dump"
sha256sum "$BACKUP"/*.dump
pg_restore --list "$BACKUP"/*.dump >/dev/null
```

Record the exact dump path and checksum before deployment. Copy it off-host according to the operator-approved retention policy.

## Deploy and migrate

```sh
docker compose config --quiet
docker compose build
docker compose up -d db
docker compose run --rm --no-deps app node_modules/.bin/prisma migrate deploy
docker compose up -d --no-deps app worker
docker compose ps
docker compose logs --since=15m app worker
```

The regular app entrypoint also migrates before starting. The worker waits for PostgreSQL but never migrates. Do not start multiple app replicas during migration.

Verify `/api/health/ready`, application behavior, worker startup, error rate, latency, and logs for 15 minutes. Record confirm-or-rollback decision.

## Migration failure

Stop. Do not use `prisma db push`, `--accept-data-loss`, or manually mark a failed migration without reviewing its SQL and database state.

```sh
docker compose stop app worker
docker compose run --rm --no-deps app node_modules/.bin/prisma migrate status
docker compose logs --since=30m app
```

Operator decides one path: fix forward with a reviewed migration; redeploy the previous image when schema remains compatible; restore when data/schema integrity requires it. Record evidence and approver.

## Restore

Restore is destructive. Confirm the selected backup checksum, outage approval, blast radius, and application rollback image first.

```sh
docker compose stop app worker
docker compose exec -T db dropdb -U postgres --if-exists shuttlecall
docker compose exec -T db createdb -U postgres shuttlecall
BACKUP_FILE=/absolute/path/to/selected.dump
docker compose exec -T db pg_restore -U postgres -d shuttlecall --clean --if-exists < "$BACKUP_FILE"
docker compose up -d app worker
docker compose ps
docker compose logs --since=15m app worker
```

Verify readiness, critical reads/writes, worker startup, migration status, error rate, latency, and logs. Record recovery decision and follow-up actions.
