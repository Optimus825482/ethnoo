FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./

# Coolify passes COOLIFY_BUILD_SECRETS_HASH — changes on env/config update, busts stale npm cache
ARG COOLIFY_BUILD_SECRETS_HASH
RUN echo "cache-bust: ${COOLIFY_BUILD_SECRETS_HASH}" && npm ci --production=false

COPY . .
RUN npx prisma generate
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3016
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache openssl bash postgresql-client
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/public/images/locations /app/uploads && \
    chown -R nextjs:nodejs /app/public /app/uploads

COPY --chown=nextjs:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3016

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
