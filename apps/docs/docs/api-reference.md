---
sidebar_position: 4
---

# API Reference

JobTopBob exposes a RESTful API via the Go backend (Gin framework) at port `8080`.

## Authentication

All API endpoints (except health check) require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Tokens are issued by the Next.js frontend via Better Auth's JWT plugin. The Go API validates tokens stateless via the JWKS endpoint at `GET /api/auth/jwks`.

## Base URL

- Development: `http://localhost:8080`
- Production: configured via `NEXT_PUBLIC_API_URL`

## OpenAPI spec

The full API specification is defined in [`openapi/jobtopbob.yaml`](https://github.com/jobtopbob/jobtopbob/blob/main/openapi/jobtopbob.yaml).

### Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/jobs` | List jobs (with filtering, sorting, pagination) |
| `POST` | `/api/v1/jobs` | Create a job |
| `GET` | `/api/v1/jobs/:id` | Get a single job |
| `PUT` | `/api/v1/jobs/:id` | Update a job |
| `DELETE` | `/api/v1/jobs/:id` | Delete a job |
| `GET` | `/api/v1/companies` | List companies |
| `GET` | `/api/v1/contacts` | List contacts |
| `GET` | `/api/v1/offers` | List offers |
| `GET` | `/api/v1/stats` | Get dashboard statistics |
| `GET` | `/api/v1/stages` | List pipeline stages |
| `GET` | `/api/v1/tags` | List tags |
| `GET` | `/api/v1/settings` | Get user settings |
| `GET` | `/api/v1/events` | SSE event stream |
| `GET` | `/api/v1/export/jobs` | Export jobs (JSON/CSV) |

### AI endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/jobs/:id/extract` | Extract JD fields via AI |
| `POST` | `/api/v1/jobs/:id/score` | Score job suitability |
| `POST` | `/api/v1/jobs/:id/ats-score` | ATS keyword match |
| `POST` | `/api/v1/jobs/:id/cover-letter` | Generate cover letter |
| `POST` | `/api/v1/jobs/:id/interview-prep` | Generate interview prep |
| `POST` | `/api/v1/jobs/:id/tailor-resume` | Resume tailoring suggestions |

## TypeScript client

TypeScript types are auto-generated from the OpenAPI spec into `packages/api-client/`. The frontend uses `openapi-fetch` for type-safe API calls:

```typescript
import { api } from "@/lib/api";

const { data, error } = await api.GET("/api/v1/jobs", {
  params: { query: { limit: 20, offset: 0 } },
});
```
