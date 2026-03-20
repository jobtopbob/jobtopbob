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
COPY scrapers/glassdoor/package.json scrapers/glassdoor/
COPY packages/ packages/

RUN pnpm install --frozen-lockfile

# Copy source
COPY scrapers/glassdoor/ scrapers/glassdoor/

RUN pnpm --filter @jobtopbob/scraper-glassdoor build

# Non-root user
RUN groupadd -r scraper && useradd -r -g scraper -m scraper
USER scraper

EXPOSE 3000

CMD ["node", "scrapers/glassdoor/dist/index.js"]
