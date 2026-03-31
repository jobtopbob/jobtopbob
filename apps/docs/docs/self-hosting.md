---
sidebar_position: 2
---

# Self-Hosting Guide

JobTopBob is designed to run on a single machine with Docker Compose. The target is a $10/month VPS with 2 GB RAM.

## Requirements

- Docker Engine 24+
- Docker Compose v2
- 2 GB RAM minimum (4 GB recommended)
- 10 GB disk space

## Environment variables

Copy `.env.example` and configure:

```bash
cp .env.example .env
```

### Required variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Root PostgreSQL password |
| `APP_DB_PASSWORD` | Application database user password |
| `REDIS_PASSWORD` | Redis password |
| `BETTER_AUTH_SECRET` | 64-character random string for auth |
| `API_ENCRYPTION_KEY` | 32-byte hex key for OAuth token encryption |

Generate secrets:

```bash
openssl rand -hex 32   # for BETTER_AUTH_SECRET
openssl rand -hex 16   # for API_ENCRYPTION_KEY
```

### AI provider (optional)

Set `AI_PROVIDER` and the matching API key:

```bash
# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Anthropic (native SDK)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini (native SDK)
AI_PROVIDER=gemini
GEMINI_API_KEY=...

# OpenRouter (100+ models via one key)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...

# Ollama (local, no API key needed)
AI_PROVIDER=ollama
OLLAMA_HOST=http://host.docker.internal:11434
```

See [AI Setup](/features/ai-setup) for full configuration details.

### Deployment profiles

| Profile | What runs |
|---------|-----------|
| (empty) | Infrastructure only (Postgres, Redis, RustFS, Resume Builder) |
| `prod` | Infrastructure + web, API, worker |
| `prod,scrapers` | Everything including job scrapers |

Set in `.env`:

```bash
COMPOSE_PROFILES=prod
```

## Starting

```bash
docker compose up -d
```

The frontend is available at `http://localhost:3000` (or your server IP).

## Reverse proxy (HTTPS)

For production, put a reverse proxy in front. Example with Caddy:

```
jobtopbob.example.com {
    reverse_proxy localhost:3000
}

api.jobtopbob.example.com {
    reverse_proxy localhost:8080
}
```

Update `.env` to match your domain:

```bash
BETTER_AUTH_URL=https://jobtopbob.example.com
NEXT_PUBLIC_API_URL=https://api.jobtopbob.example.com
```

## Backups

The worker runs a daily PostgreSQL backup via `pg_dump`. Backup files are stored in the `backups` Docker volume.

To manually trigger a backup:

```bash
docker compose exec api pg_dump -U postgres jobtopbob > backup.sql
```

## Updating

```bash
git pull
docker compose build
docker compose up -d
```

Migrations run automatically on startup via the `migrate` init container.
