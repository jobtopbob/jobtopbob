---
sidebar_position: 5
---

# Contributing

We welcome contributions! Please read the full [CONTRIBUTING.md](https://github.com/jobtopbob/jobtopbob/blob/main/CONTRIBUTING.md) in the repository for detailed setup instructions, conventions, and guidelines.

## Quick start

```bash
git clone https://github.com/jobtopbob/jobtopbob.git
cd jobtopbob
cp .env.example .env
pnpm install
docker compose up -d   # starts Postgres, Redis, RustFS, Resume Builder
```

Then run the services:

```bash
pnpm dev                           # Next.js frontend
go run ./apps/api/cmd/api          # Go API
go run ./apps/worker/cmd/worker    # Background worker
```

## Code generation

After modifying SQL queries or OpenAPI spec:

```bash
./scripts/sqlc-generate.sh          # SQL → Go functions
./scripts/generate-api-client.sh    # OpenAPI → TypeScript types
```

## Quality checks

```bash
# Go
go vet ./...
go test ./...

# TypeScript
pnpm turbo check-types
pnpm turbo lint
```

## High-impact areas

- **Scrapers** — add support for new job boards
- **AI prompts** — improve extraction, scoring, and generation quality
- **Translations** — internationalization support
- **Documentation** — improve guides and tutorials

## Branch naming

```
feature/short-description
fix/short-description
docs/short-description
```

## License

By contributing, you agree that your contributions will be licensed under AGPL-3.0.
