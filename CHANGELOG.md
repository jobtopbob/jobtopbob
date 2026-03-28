# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-28

### Added

- Kanban board with drag-and-drop, list, table, and calendar views
- Custom stages with rename, reorder, and color options
- Application state machine mapping stages to status (open, accepted, rejected, closed)
- Company profiles with enrichment and logo upload
- Contact CRM with relationship tracking and avatar upload
- Offer tracking and comparison
- Resource library with pinning
- Integrated resume builder via Reactive Resume v5
- Resume version snapshots linked to applications
- AI features (BYOK): job extraction, suitability scoring, ATS scoring, cover letter generation, interview prep, resume tailoring, Ghostwriter chat
- OpenAI-compatible and Ollama AI provider support
- Gmail email integration with intent classification and tracking inbox
- Job discovery pipeline with search profiles and Adzuna scraper
- Real-time updates via SSE (Redis Pub/Sub bridge)
- Full JSON and CSV export for jobs, companies, contacts, and offers
- Tags with polymorphic assignment across entities
- Activity log with timeline view
- Global search with Cmd+K
- Bulk select and bulk actions
- Follow-up reminder tracking
- Dark mode support
- Docker Compose deployment with multi-profile support (dev, prod, scrapers)
- Better Auth v1.5 with email/password and Google OAuth
- Stateless JWT validation in Go API via JWKS
- Row-level security on all user-owned tables
- OAuth token encryption (AES-256-GCM)
- S3-compatible storage via RustFS
