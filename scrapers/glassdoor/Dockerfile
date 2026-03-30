FROM node:25.8-slim
WORKDIR /app

RUN npm install -g pnpm@10.33.0

# Install Playwright system dependencies + Chromium
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && npx playwright install --with-deps chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy workspace root files + all workspace package.json for lockfile resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scrapers/glassdoor/package.json scrapers/glassdoor/
COPY scrapers/shared/package.json scrapers/shared/
COPY scrapers/adzuna/package.json scrapers/adzuna/
COPY scrapers/indeed/package.json scrapers/indeed/
COPY scrapers/linkedin/package.json scrapers/linkedin/
COPY apps/web/package.json apps/web/
COPY apps/docs/package.json apps/docs/
COPY packages/ packages/

RUN pnpm install --frozen-lockfile

# Copy source (shared is needed — it exports raw .ts files)
COPY scrapers/shared/ scrapers/shared/
COPY scrapers/glassdoor/ scrapers/glassdoor/

RUN pnpm --filter @jobtopbob/scraper-glassdoor build

# Non-root user
RUN groupadd -r scraper && useradd -r -g scraper -m scraper
USER scraper

EXPOSE 3000

CMD ["node", "scrapers/glassdoor/dist/index.js"]
