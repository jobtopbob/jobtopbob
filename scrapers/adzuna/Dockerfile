FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Minimal deps — Adzuna is API-only (no browser needed)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scrapers/adzuna/package.json scrapers/adzuna/
COPY packages/ packages/

RUN pnpm install --frozen-lockfile

# Copy source
COPY scrapers/adzuna/ scrapers/adzuna/

RUN pnpm --filter @jobtopbob/scraper-adzuna build

# Non-root user
RUN groupadd -r scraper && useradd -r -g scraper -m scraper
USER scraper

EXPOSE 3000

CMD ["node", "scrapers/adzuna/dist/index.js"]
