FROM node:20-slim
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install Playwright system dependencies + Chromium
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && npx playwright install --with-deps chromium \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scrapers/indeed/package.json scrapers/indeed/
COPY packages/ packages/

RUN pnpm install --frozen-lockfile

# Copy source
COPY scrapers/indeed/ scrapers/indeed/

RUN pnpm --filter @jobtopbob/scraper-indeed build

# Non-root user
RUN groupadd -r scraper && useradd -r -g scraper -m scraper
USER scraper

EXPOSE 3000

CMD ["node", "scrapers/indeed/dist/index.js"]
