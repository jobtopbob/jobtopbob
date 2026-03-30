# ---------- Stage 1: Install + Build ----------
FROM node:25.8-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10.33.0

# Copy workspace root files needed for install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/ packages/
COPY scrapers/adzuna/package.json scrapers/adzuna/
COPY scrapers/glassdoor/package.json scrapers/glassdoor/
COPY scrapers/indeed/package.json scrapers/indeed/
COPY scrapers/linkedin/package.json scrapers/linkedin/
COPY scrapers/shared/package.json scrapers/shared/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY apps/web/ apps/web/
COPY turbo.json ./

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @jobtopbob/web build

# ---------- Stage 2: Runtime ----------
FROM node:25.8-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

RUN mkdir -p /app/apps/web/.next/cache \
    && chown nextjs:nodejs /app/apps/web/.next/cache

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
