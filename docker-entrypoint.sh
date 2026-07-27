#!/bin/bash
set -e
# ponytail: disable exit-on-error for seed step — seed is best-effort, dupes OK

echo "=== ShuttleCall Entry Point ==="

if [ -n "$DATABASE_URL" ]; then
  DB_HOST=$(printf '%s' "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
  DB_PORT=$(printf '%s' "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_PORT=${DB_PORT:-5432}

  if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "Waiting for Postgres at $DB_HOST:$DB_PORT ..."
    ready=false
    for attempt in $(seq 1 30); do
      if pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 5 >/dev/null 2>&1; then
        ready=true
        break
      fi
      echo "  Postgres not ready ($attempt/30)"
      sleep 2
    done
    if [ "$ready" != true ]; then
      echo "Postgres unavailable after 30 attempts." >&2
      exit 1
    fi
  fi
fi

if [ "$1" = "node" ] && [ "${2:-}" = "server.js" ]; then
  echo "Running database migrations..."
  node_modules/.bin/prisma migrate deploy
  echo "Migrations done."

  echo "Seeding initial data..."
  if [ -f /app/prisma/seed-data.sql ]; then
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
    DB_HOST2=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    export PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
    set +e
    psql -h "$DB_HOST2" -U "$DB_USER" -d shuttlecall -f /app/prisma/seed-data.sql 2>&1
    echo "Seed result: $?"
    set -e
  fi
fi

mkdir -p /app/public/images/locations

exec "$@"
