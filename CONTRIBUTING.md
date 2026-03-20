# Contributing to JobTopBob

Thanks for your interest in contributing to JobTopBob! This guide will help you get set up and outline how we work together.

## Code of Conduct

Be respectful, constructive, and inclusive. We're building something useful for job seekers — let's keep the community welcoming.

## Prerequisites

- **Node.js** v20+ and **pnpm** (package manager)
- **Go** 1.22+
- **Docker** and **Docker Compose**
- **Git**

Optional:
- [sqlc](https://sqlc.dev/) v1.30 — only needed if you modify `.sql` query files
- [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen) — only needed if you modify the OpenAPI spec

## Getting Started

```bash
# 1. Fork and clone the repo
git clone https://github.com/<your-username>/jobtopbob.git
cd jobtopbob

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Install all TypeScript dependencies (web + scrapers + packages)
pnpm install

# 4. Start infrastructure (Postgres + Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# 5. Run database migrations
cd apps/api && go run ./cmd/migrate/main.go up && cd ../..

# 6. Start all services in development mode
pnpm dev
```

### Dev URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Go API | http://localhost:8080 |
| Resume Builder | http://localhost:3010 |
| Asynq Inspector | http://localhost:8081 |

### Code Generation

Only run these when you modify the relevant source files:

```bash
# After editing .sql query files in apps/api/db/queries/
./scripts/sqlc-generate.sh

# After editing openapi/jobtopbob.yaml
./scripts/generate-api-client.sh
```

## What to Work On

Look for issues labelled **`good-first-issue`** on GitHub. Here are high-impact areas:

### Scrapers (TypeScript)

Add support for a new job board. Create `scrapers/<board>/`, implement a `POST /scrape` HTTP endpoint that accepts `ScrapeTask` and returns `RawJob[]`. See `scrapers/adzuna/` for a fetch-based reference or `scrapers/indeed/` for Playwright-based.

Each scraper needs:
- `src/scraper.ts` — scraping logic
- `package.json` with `tsconfig.json` extending `@jobtopbob/config/tsconfig.base.json`
- `Dockerfile`
- Registration in `docker-compose.yml`

### Go API / Worker

New endpoints follow this workflow:
1. Add to `openapi/jobtopbob.yaml`
2. Run `./scripts/generate-api-client.sh`
3. Implement the handler in `internal/handlers/`
4. Add business logic in `internal/services/`
5. Write sqlc queries in `db/queries/` and run `./scripts/sqlc-generate.sh`
6. Write integration tests in `internal/handlers/<feature>_test.go`

### AI Prompts

Improve prompt quality in `internal/ai/prompts/`. Prompts are plain `.txt` files — no Go knowledge required. Each prompt has a corresponding golden test:

```bash
go test ./internal/ai/prompts/...
```

### Translations

i18n is handled via `next-intl`. Add a new locale by creating `apps/web/messages/<locale>.json` and translating the keys from `en.json`.

## Code Conventions

### Go

- `gofmt` and `golangci-lint` must pass — CI blocks on violations
- No `interface{}` / `any` in new code without justification
- Errors are returned, not panicked — wrap with `fmt.Errorf("context: %w", err)`
- All SQL queries go in `db/queries/*.sql` — no raw SQL strings in handler code
- Handlers are thin: validate input, call a service function, write response. Business logic lives in `internal/services/`

### TypeScript (web, scrapers, packages)

- Strict TypeScript throughout — no `any`. CI runs `tsc --noEmit` across the workspace
- Generated API types in `packages/api-client/` are the source of truth — do not cast around them
- Components in `packages/ui/` are unstyled primitives; app-specific styling lives in `apps/web/`
- ESLint config is shared from `packages/config/`

### Version-Specific Notes

- **Next.js 16:** `params` and route segment props are async — must be `await`-ed
- **Tailwind CSS v4:** CSS-native config (`@import "tailwindcss"`), no `tailwind.config.js`
- **TanStack Query v5:** Single-object arguments for all hooks
- **@dnd-kit/react v0.x:** Unified package replacing the old `@dnd-kit/core` + `@dnd-kit/sortable`

## Running Checks

Run these before submitting a PR:

```bash
# Go
go vet ./...
golangci-lint run
go test ./...

# TypeScript
pnpm tsc --noEmit
pnpm eslint .
pnpm prettier --check .
pnpm vitest

# E2E
pnpm playwright test
```

## Submitting Changes

1. **Open an issue first** for significant work — saves effort if the direction doesn't fit the project
2. **One feature or fix per PR** — keep PRs small and reviewable
3. **Generated files must be committed and up to date** — CI checks `apps/api/db/generated/` and `packages/api-client/` and fails if they are stale
4. **Tests are required** for new Go handler routes, service functions, and scraper parsing logic
5. **Update the OpenAPI spec** and run codegen if you change any API shape
6. **Update docs** in `apps/docs/` if user-visible behaviour changes

### Branch Naming

Use descriptive branch names:
- `feature/add-glassdoor-scraper`
- `fix/job-status-update`
- `docs/api-endpoints`

### Commit Messages

Write clear, concise commit messages. Use conventional format:

```
feat(scrapers): add glassdoor scraper
fix(api): correct job status transition validation
docs(readme): update setup instructions
```

## Architecture Overview

Understanding the system helps you contribute effectively:

- **Frontend** (`apps/web`) — Next.js 16 with Better Auth for authentication (issues JWTs)
- **API** (`apps/api`) — Go + Gin, validates JWTs via JWKS, no shared session state
- **Worker** (`apps/worker`) — Go + Asynq, processes background jobs from a Redis queue
- **Scrapers** (`scrapers/*`) — Stateless TypeScript HTTP services
- **Shared Go** (`internal/`) — AI provider abstraction + crypto utilities

Data flow: **Browser → Next.js (auth) → Go API → PostgreSQL/Redis**. The worker publishes events via Redis Pub/Sub, which the API forwards as SSE to the browser.

For the full engineering specification, see `documentation/Implementation Plan.md`.

## Licence

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](LICENSE) licence. If you host a modified version, you must publish your source code.

## Questions?

Open a [GitHub Discussion](https://github.com/jobtopbob/jobtopbob/discussions) or file an issue. We're happy to help you get started.
