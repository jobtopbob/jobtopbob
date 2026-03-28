---
slug: /
sidebar_position: 1
---

# Getting Started

JobTopBob is an open-source job application management platform. It combines a job application tracker, integrated resume builder (powered by [Reactive Resume](https://rxresu.me)), and AI assistant in a single self-hosted platform.

## Quickstart

**Prerequisites:** [Docker](https://www.docker.com) and [Docker Compose](https://docs.docker.com/compose/)

```bash
git clone https://github.com/jobtopbob/jobtopbob.git
cd jobtopbob
cp .env.example .env
```

Edit `.env` to set your secrets and optionally configure an AI provider, then:

```bash
# Development (infrastructure only — app services run on host)
docker compose up -d
pnpm install
pnpm dev                           # Next.js on :3000
go run ./apps/api/cmd/api          # Go API on :8080
go run ./apps/worker/cmd/worker    # Background worker
```

```bash
# Production (everything in containers)
# Set COMPOSE_PROFILES=prod in .env, then:
docker compose up -d
```

## What's included

- **Application Tracker** — Kanban board, list, table, and calendar views
- **Resume Builder** — Integrated Reactive Resume with version snapshots
- **AI Assistant** — Suitability scoring, cover letters, interview prep, ATS scoring (BYOK)
- **Email Integration** — Gmail auto-detection of interviews, rejections, and offers
- **Discovery Pipeline** — Automated job scraping from multiple boards
- **Data Ownership** — Full JSON/CSV export, self-hosted, AGPL-3.0 licensed

## Architecture overview

| Service | Tech | Port |
|---------|------|------|
| Frontend | Next.js 16 (App Router) | 3000 |
| API | Go + Gin | 8080 |
| Worker | Go + Asynq (Redis) | — |
| Resume Builder | Reactive Resume v5 | 3010 |
| Database | PostgreSQL 16 | 5432 |
| Cache/Queue | Redis 7 | 6379 |

See the [self-hosting guide](./self-hosting) for detailed deployment instructions.
