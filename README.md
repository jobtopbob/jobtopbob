# JobTopBob

> Open-source job application management. Every feature, free — forever.

JobTopBob combines a job application tracker, integrated resume builder (powered by [Reactive Resume](https://rxresu.me)), and AI job assistant in a single open-source platform. Self-host it for free with your own AI key, or use the managed cloud version and let us handle the infrastructure.

No feature gates. No crippled free tier. No data selling.

### Email Integration — your inbox updates your tracker

Connect your Gmail and JobTopBob automatically detects recruiter replies, interview invites, rejections, and offers — then updates your application status for you. No more manually dragging cards after every email. The AI classifies each message's intent and surfaces it in a Tracking Inbox for you to confirm before anything changes. Your email content is never stored — only a short excerpt and the classification result are kept. Revoke access anytime and all data is deleted instantly.

**This is the feature that makes job tracking actually stick.** Most trackers die because users stop updating them. Email Integration keeps your board accurate without lifting a finger.

---

## Why JobTopBob

The average successful job search requires 100–200 applications over 5–8 months. Spreadsheets break under that load. Proprietary tools like Teal ($29/mo) and Huntr ($40/mo) charge significant recurring fees to users who are often unemployed — and have drawn criticism for selling resume data, blocking data export, and producing generic AI output.

Open-source alternatives exist for resume building (Reactive Resume, 1M+ users) but nothing meaningful combines a resume builder with a full application tracker. That's the gap JobTopBob fills — integrating Reactive Resume v5 as a microservice rather than rebuilding from scratch.

---

## Quickstart

**Prerequisites:** [Node.js 20+](https://nodejs.org), [pnpm 10.26+](https://pnpm.io), [Go 1.26+](https://go.dev), [Docker](https://www.docker.com)

### Development

```bash
# 1. Clone and configure
git clone https://github.com/jobtopbob/jobtopbob.git
cd jobtopbob
cp .env.example .env        # Docker infrastructure config (service hostnames, passwords)

# 2. (Optional) Create .env.local for host-specific secrets
cp .env.local.example .env.local
# Edit .env.local to add API keys — see below

# 3. Install TypeScript dependencies
pnpm install

# 4. Start infrastructure (Postgres, Redis, Resume Builder, Asynq Inspector)
docker compose up -d

# 5. Start the Next.js frontend (terminal 1)
pnpm dev

# 6. Start Go services (terminals 2 & 3)
go run ./apps/api/cmd/api
go run ./apps/worker/cmd/worker
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Go API | http://localhost:8080 |
| Resume Builder | http://localhost:3010 |
| Asynq Inspector | http://localhost:8081 |

> **Note:** `pnpm dev` starts the Next.js web app only. The Go API and worker are separate processes — they're not part of the pnpm workspace, so they need their own terminal.

#### Environment files

There are two env files, each for a different context:

| File | Purpose | Loaded by |
|------|---------|-----------|
| `.env` | Docker infrastructure — service hostnames (`redis`, `web`), passwords, ports | Docker Compose |
| `.env.local` | Host-based dev secrets — API keys and overrides that use `localhost` | Go API (via godotenv) |

The root `.env` uses Docker service names (e.g. `REDIS_URL=redis://:changeme@redis:6379/0`) which don't resolve on the host. The Go API's `config.go` already defaults to `localhost` for all connection strings, so you typically only need `.env.local` for API provider keys.

Both files are gitignored. Next.js uses its own `apps/web/.env.local` (loaded automatically by Next.js).

### Self-hosting (production)

Everything runs in Docker — no host toolchain required:

```bash
cp .env.example .env         # configure secrets and AI keys
```

Set `COMPOSE_PROFILES` in `.env` to control which services start:

| Value | What starts |
|-------|-------------|
| *(empty)* | Infrastructure only (Postgres, Redis, etc.) — for local dev |
| `prod` | Infrastructure + app services (web, api, worker) |
| `prod,scrapers` | Everything including job discovery scrapers |

```bash
# Set once in .env, then use plain commands for everything:
docker compose up -d
docker compose down
docker compose logs
```

All configuration is in `.env` — see `.env.example` for the full reference.

### Demo mode

Seed the database with a demo user and realistic sample data (15 jobs across 8 stages, 15 companies, tags) to explore the full UI without manually creating anything. Requires infrastructure to be running first (`docker compose up -d`).

#### Development

Step 1 must run before step 2 — the demo user (with password hash) must exist before the API seeds application data for it.

```bash
# 1. Create the demo user (uses Better Auth for correct password hashing)
pnpm --filter @jobtopbob/web seed:demo

# 2. Start the API with demo data seeding enabled
SEED_DEMO_DATA=true go run ./apps/api/cmd/api

# Or run both steps at once:
./scripts/seed-demo.sh
```

#### Docker (production / self-hosted)

Set `SEED_DEMO_DATA=true` in your `.env` file before starting. The demo user must be created first via the seed script — the API only seeds application data (stages, jobs, tags) for an existing demo user.

```bash
echo 'SEED_DEMO_DATA=true' >> .env
pnpm --filter @jobtopbob/web seed:demo
docker compose --profile prod up -d
```

The sign-in page shows a **Try Demo** button when `SEED_DEMO_DATA` is enabled.

**Demo credentials:** `demo@jobtopbob.com` / `demo1234`

---

## Features

### Application tracker
- Kanban, list, table, and calendar views
- Five default stages: Saved → Applied → Interviewing → Offer → Closed
- Custom stages — rename, reorder, or add columns to match your process
- Full application state machine powering automation and analytics
- Auto-archiving of job descriptions (persists after postings expire)
- Follow-up reminders calculated automatically — no manual date-setting
- Resume version recorded per application for later A/B analysis
- Bulk actions and keyboard shortcuts for high-volume searches
- Global fuzzy search with `@status` filtering

### Resume builder (powered by Reactive Resume v5)
- 13 built-in templates with CSS customisation, colour/typography control
- Multiple named resume versions (e.g. "v3 — growth roles")
- Real-time preview, drag-and-drop section reordering
- Export to PDF and JSON (DOCX export via JobTopBob worker)
- Version history with restore
- Resume-to-application linking with A/B analytics

### Email Integration (flagship feature)
- **Gmail integration** — connects your inbox via OAuth (`gmail.readonly` only — the app never sends or modifies emails)
- **AI email classification** — detects recruiter replies, interview invites, rejections, and offers automatically
- **Tracking Inbox** — every detected event surfaces for your review before any status change commits
- **Privacy-first** — email body is used for classification then discarded; only a short excerpt and result are stored
- **Zero-trust updates** — the app never silently moves your cards; you confirm or dismiss every change
- **Instant revoke** — disconnect Gmail anytime; all stored tokens and email events are deleted immediately

### AI features (BYOK or managed)
- **Suitability scoring** — AI ranks discovered jobs 0–100 against your profile before you apply
- **ATS keyword scoring** — match your resume to a specific job description
- **Resume tailoring** — rewrites bullet points to better reflect relevant experience; never invents content
- **Cover letter generation** — tone, length, and emphasis controls; stored per application
- **Interview prep** — role-specific questions, company research brief, answer rubric
- **Ghostwriter** — persistent open-ended AI chat per application for anything the above buttons don't cover
- **Manual JD import** — paste any job description; AI extracts fields and scores fit instantly

### Job discovery (optional)
- Automated pipeline scraping LinkedIn, Indeed, Glassdoor, Adzuna, and more
- Configurable minimum suitability score threshold
- Discovered jobs flow into the tracker pre-scored and pre-tailored

### Networking & research
- Standalone contacts CRM linked to applications (not duplicated per card)
- Company profiles database — save companies before roles open
- Salary benchmarking per application: expected, market rate, final offer

### Offer management
- Side-by-side offer comparison matrix
- Priority weighting (e.g. salary 40%, remote 30%, growth 30%)
- Negotiation history log per offer

### Analytics
- Response rate, interview conversion, time-in-stage
- Resume version A/B performance
- Applications-per-day trend with time-window controls
- Weekly goal tracking and consistency dashboard

---

## AI providers

**BYOK** = Bring Your Own API Key. Two provider implementations cover all models:

- **OpenAI-compatible** — supports OpenAI directly, plus Anthropic, Gemini, and 100+ other models via [OpenRouter](https://openrouter.ai) (which uses the OpenAI API format)
- **Ollama** — local models with zero API key requirement, fully offline

You pay your provider directly — JobTopBob never charges for AI usage. The cloud version also offers managed AI so you can skip key setup entirely.

---

## Privacy

- Self-hostable via Docker Compose — your data never leaves your machine
- Full data export in JSON and CSV at any time, with no waiting period
- Resume content is never used to train models or sold to third parties
- All AI prompts are open source and auditable
- Browser extension requests only the permissions needed — no "read all pages"
- **Gmail: read-only access** — the app never sends, deletes, or modifies your emails
- **No email storage** — message bodies are classified by AI then discarded; only a short excerpt and result are kept
- **Instant revoke** — disconnect Gmail from settings and all tokens + email events are deleted immediately

---

## Licence

AGPL-3.0. Self-host, fork, and modify freely. Anyone hosting a modified version must publish their source code under the same licence. Commercial licence available for institutions with procurement constraints.

---

## Contributing

All contributions welcome — features, templates, extractors, translations, and documentation. See `CONTRIBUTING.md` to get started.

---

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, TanStack Query v5, shadcn/ui |
| API | Go + Gin v1.10, sqlc v1.30, golang-migrate v4.18 |
| Worker | Go + Asynq v0.28 |
| Resume builder | Reactive Resume v5 (integrated as microservice) |
| Database | PostgreSQL 16 |
| Queue / cache | Redis 7 |
| Scrapers | TypeScript + Playwright v1.58 |

---

*Built on the shoulders of Reactive Resume, job-ops, and the open-source job-search community.*

## Star History

<a href="https://www.star-history.com/?repos=jobtopbob%2Fjobtopbob&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=jobtopbob/jobtopbob&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=jobtopbob/jobtopbob&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=jobtopbob/jobtopbob&type=date&legend=top-left" />
 </picture>
</a>