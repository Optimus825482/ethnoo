# Health endpoints

- `GET /api/health/live`: process-only liveness; never queries DB.
- `GET /api/health/ready`: read-only PostgreSQL connection plus `_prisma_migrations` schema marker.
- Both disable caching and return `x-request-id`.
- Readiness returns HTTP 503 and a generic digest on failure. Internal JSON logs carry matching context.

Never use readiness to migrate, seed, repair, or write data.
