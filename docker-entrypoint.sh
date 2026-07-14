#!/bin/bash
set -e

echo "=== ShuttleCall Entry Point ==="

# Wait for Postgres if DATABASE_URL points to a separate host
if [ -n "$DATABASE_URL" ]; then
  # Extract host from DATABASE_URL
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
  DB_PORT=${DB_PORT:-5432}

  if [ -n "$DB_HOST" ] && [ "$DB_HOST" != "localhost" ] && [ "$DB_HOST" != "127.0.0.1" ]; then
    echo "Waiting for Postgres at $DB_HOST:$DB_PORT ..."
    until pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 5; do
      echo "  Postgres not ready, retrying..."
      sleep 2
    done
    echo "Postgres is ready!"
  fi
fi

# Run Prisma migrations
echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy 2>&1 || {
  echo "migrate deploy failed, trying db push..."
  node_modules/.bin/prisma db push --accept-data-loss 2>&1
}
echo "Migrations done."

# Run seed (idempotent — uses upsert for users/hotel)
echo "Seeding database..."
node_modules/.bin/tsx prisma/seed.ts 2>&1 || echo "Seed skipped (may already exist)."
echo "Seed done."

# Ensure uploads dir is writable
mkdir -p /app/public/images/locations /app/uploads 2>/dev/null || true

echo "=== Starting Next.js ==="
exec "$@"
