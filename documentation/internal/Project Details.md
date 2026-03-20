# JobTopBob — Product Documentation

> An open-source job application management tool with a commercial cloud engine.

---

## Table of contents

1. [Vision & positioning](#1-vision--positioning)
2. [Core principles](#2-core-principles)
3. [Feature set](#3-feature-set)
4. [Business model](#4-business-model)
5. [Application tracker](#5-application-tracker)
6. [Networking & company research](#6-networking--company-research)
7. [Offer comparison](#7-offer-comparison)
8. [Job search goals & consistency](#8-job-search-goals--consistency)
9. [Resume builder](#9-resume-builder)
10. [AI features](#10-ai-features)
11. [Privacy & data ownership](#11-privacy--data-ownership)
12. [B2B & institutional tier](#12-b2b--institutional-tier)
13. [Licensing](#13-licensing)
14. [Competitive landscape](#14-competitive-landscape)
15. [Notion template analysis](#15-notion-template-analysis)
16. [job-ops analysis](#16-job-ops-analysis)
17. [Roadmap priorities](#17-roadmap-priorities)
18. [Cloud infrastructure & deployment](#18-cloud-infrastructure--deployment)

---

## 1. Vision & positioning

JobTopBob is a fully open-source job application management platform that combines a Kanban-style application tracker with a resume builder. Every feature is available to every user — the hosted cloud version charges for convenience and managed infrastructure, not capability.

The market for job-search tools is crowded but fragmented. Teal (2M+ users, $20M raised) and Huntr ($40/month) lead the proprietary space, but both draw sustained criticism for aggressive pricing, data privacy concerns, and AI features that produce generic output. No open-source project with meaningful traction combines a full-featured resume builder with job application tracking — this is the gap JobTopBob fills.

**Target users:**

- Active job seekers running 50–200+ applications over a multi-month search
- Developers and privacy-conscious users who want to self-host
- Coding bootcamp graduates and university students (via institutional B2B tier)
- Workforce development programs and outplacement firms

---

## 2. Core principles

### Everything open, always

All features — including AI — are available in the open-source repository. The hosted cloud version charges for operational convenience, not feature access. No feature is ever exclusively available behind a paywall.

### Privacy as architecture, not policy

Every proprietary competitor asks users to trust a privacy policy. Resume.io explicitly permits selling resume data to third parties. JobTopBob's answer is structural: open source, self-hostable, no tracking beyond what's needed to operate the service, and full data export at any time.

### No lock-in, ever

Users own their data. Full export in JSON and CSV is always available. Huntr explicitly does not support data export — JobTopBob treats portability as a non-negotiable feature, not a premium add-on. Paradoxically, removing switching costs increases user loyalty.

### Self-hosted experience must be genuinely excellent

The job-seeking audience is the most price-sensitive imaginable — many are unemployed. The open-source, self-hosted version must solve the core problem completely. A crippled self-hosted experience signals bad faith and will be forked. Every feature is available to every user — the cloud version charges for convenience and managed infrastructure, not capability.

---

## 3. Feature set

### Tier overview

| Feature | Self-hosted | Cloud ($20/mo) |
|---|---|---|
| Application tracker (full) | ✓ | ✓ |
| Resume builder (Reactive Resume v5) | ✓ | ✓ |
| JD archiving & snapshots | ✓ | ✓ |
| Manual JD import with AI extraction | ✓ BYOK | ✓ managed (200 credits/mo included) |
| Interview notes & contacts | ✓ | ✓ |
| Interview calendar view | ✓ | ✓ |
| Networking CRM | ✓ | ✓ |
| Company profiles database | ✓ | ✓ |
| Offer comparison matrix | ✓ | ✓ |
| Salary & compensation tracking | ✓ | ✓ |
| Application interest scoring | ✓ | ✓ |
| Job search goals & streaks | ✓ | ✓ |
| Resource library | ✓ | ✓ |
| Bulk actions & keyboard shortcuts | ✓ | ✓ |
| Basic analytics | ✓ | ✓ |
| Conversion funnel analytics | ✓ | ✓ |
| Full data export (JSON/CSV) | ✓ | ✓ |
| Webhook support | ✓ | ✓ |
| Automated job discovery pipeline | ✓ BYOK | ✓ managed (200 credits/mo included) |
| AI suitability scoring (pre-apply) | ✓ BYOK | ✓ managed (200 credits/mo included) |
| AI resume tailoring | ✓ BYOK | ✓ managed (200 credits/mo included) |
| AI cover letters | ✓ BYOK | ✓ managed (200 credits/mo included) |
| AI interview prep | ✓ BYOK | ✓ managed (200 credits/mo included) |
| ATS keyword scoring | ✓ BYOK | ✓ managed (200 credits/mo included) |
| Ghostwriter (per-job AI chat) | ✓ BYOK | ✓ managed (200 credits/mo included) |
| Local LLM support (Ollama) | ✓ | — |
| Smart Router (Gmail auto-status) | ✓ manual | ✓ |
| Email integration | manual setup | ✓ |
| Browser extension sync | ✓ | ✓ |
| Automatic backups | self-managed | ✓ |
| Read-only / public share mode | ✓ | ✓ |

> **BYOK** = Bring Your Own API Key. Two provider implementations: OpenAI-compatible (covers OpenAI, Anthropic, Gemini, 100+ models via OpenRouter) and Ollama (local). No managed AI costs are incurred. Cloud plan includes 200 AI credits/month; additional credit packs available at $5 per 100 credits.

---

## 4. Business model

### The honest pitch

> "Everything is free and open source. Self-host it and use your own AI key at no cost. Or pay $20/month for our cloud version — managed infrastructure, 200 AI credits included, no setup required."

### What the cloud subscription actually sells

The cloud plan is not a feature gate — it is a convenience purchase:

- No API key setup or OpenAI account required
- 200 AI credits/month included (covers typical usage)
- Additional credit packs available ($5 per 100 credits)
- Automatic daily backups
- Email integration (requires server-side infrastructure)
- Priority support

### Revenue streams

**Individual cloud subscriptions ($20/month, $200/year)**
The primary individual monetisation lever. Priced below Teal ($29) and Huntr ($40), with a cleaner value proposition: pay for convenience, not access. Includes 200 AI credits/month with high-margin credit pricing that ensures AI costs are covered with significant upside.

**B2B institutional licensing ($5,000–$50,000/year)**
Coding bootcamps, university career centres, and workforce development programs need cohort dashboards, placement rate tracking, and exportable outcome reports for accreditation. These institutions have procurement budgets, prefer open-source for compliance reasons, and are less price-sensitive than individual users. This is the primary path to sustainable revenue and should be pursued by month 12.

**Affiliate & partnership revenue (supplementary)**
Job board referrals, career coaching marketplace commissions, and course platform partnerships (similar to Teal's arrangements with Coursera and LinkedIn Learning). This should not be a primary focus until product-market fit is established.

### Billing implementation

Stripe handles all cloud payment flows. The billing package (`packages/cloud/billing`) is open source but only activates when `BILLING_ENABLED=true`. It provides:

- Plan enforcement middleware (pro plan gates, credit balance checks)
- AI credit metering and balance tracking per billing period
- Credit pack purchases via Stripe (one-time payments)
- Stripe webhook handling for subscription lifecycle events
- B2B annual invoicing and seat management

Plan structure:

| Plan | Price | AI | Notes |
|---|---|---|---|
| Pro | $20/mo ($200/yr) | 200 credits/mo included; additional $5/100 | All features; managed AI |
| Team | $49/mo (up to 5 seats) | Managed | Shared org workspace |
| Enterprise | Custom | Managed | SSO, white-label, SLA |

### AI credit system

Each cloud plan includes 200 AI credits/month. Credits are consumed per AI operation:

| Operation | Credits | Est. actual cost |
|---|---|---|
| Suitability scoring | 1 | ~$0.005 |
| JD extraction | 1 | ~$0.006 |
| ATS keyword scoring | 2 | ~$0.01 |
| Ghostwriter message | 3 | ~$0.03 |
| Cover letter generation | 5 | ~$0.02 |
| Resume tailoring | 5 | ~$0.03 |
| Interview prep | 5 | ~$0.025 |
| Smart Router (email) | 1 | ~$0.003 |

200 credits/month covers typical active usage (~5–8x margin over actual API cost). Users who exceed their monthly credits can purchase additional packs at $5 per 100 credits (~10x margin). Unused credits do not roll over. Self-hosted users with BYOK keys are unaffected — credits only apply to managed AI on the cloud plan.

### Sustainability warning

Reactive Resume — the leading open-source resume builder with 1M+ users — generates approximately €600/year in donations despite massive usage. Donations alone cannot sustain a consumer open-source tool. A deliberate commercial strategy (cloud subscriptions + B2B contracts) is required from day one to avoid the maintainer burnout trap.

---

## 5. Application tracker

The tracker is the daily-use heart of the product. It must perform well at two scales: a handful of applications in week one, and 150+ entries by month four.

### Views

- **Kanban** — default view; columns represent application stages
- **List** — compact view sorted by date, stage, or company
- **Table** — spreadsheet-style with sortable and filterable columns
- **Timeline** — chronological view of all activity across applications
- **Calendar** — dedicated view of all upcoming interviews and follow-up deadlines

### Kanban columns (default)

| Column | Purpose |
|---|---|
| Saved | Pre-application wishlist; curate before committing |
| Applied | Submitted applications awaiting response |
| Interviewing | Active interview processes with round tracking |
| Offer | Received offers with compensation details and deadlines |
| Closed | Rejected, withdrew, declined, or ghosted — with reason |

Columns are renameable and reorderable. Users can add custom columns (e.g. "Take-home test", "Background check") to match their actual process.

### Application card fields

Each application card captures:

- Company name and role title — linked to the company profiles database
- Application date and source (job board)
- Location type (remote / hybrid / on-site)
- Interest score (1–5) — user rates how much they want the role; used to prioritise effort and filter views
- Expected salary range — user's expectation for this role, drawn from salary research
- Resume version used — links directly to the resume variant submitted
- Job description snapshot (auto-archived on add; persists after posting expires)
- Current stage and sub-stage (e.g. interviewing → round 2 of 4)
- Contacts: recruiter, hiring manager, interviewer names and emails — linked to networking CRM
- Notes per interview round
- Compensation details (for offer stage): base, equity, bonus, benefits
- Follow-up due date (auto-calculated; 7 days after applying if no response)

### Resume version tracking

Every applied card records which resume variant was submitted. This enables users to later correlate response rates to specific resume versions — a feature no current tool handles well. The data feeds directly into advanced analytics (resume A/B performance by version).

### JD archiving

Job postings disappear within days of being filled. When a user adds a role to the tracker, the full job description is automatically snapshotted. This persists even after the original posting is taken down, ensuring users can reference the exact requirements when preparing for interviews.

### Follow-up reminders

Follow-up due dates are calculated automatically, not configured manually. The default rule is 7 days post-application with no response — configurable per user. Due follow-ups surface in the dashboard stat bar as a live count. Users can dismiss, snooze, or mark as actioned.

### Stat bar

Four persistent metrics visible at all times:

- Total applied
- Response rate (responses ÷ total applied, expressed as %)
- Active interviews
- Follow-ups due (highlighted in warning colour when > 0)

Response rate is the metric users care about most and cannot calculate easily from a spreadsheet. Showing it prominently drives engagement and surfaces the value of AI tailoring features.

### Filters

- Location type (remote, hybrid, on-site)
- Seniority level
- Follow-up due
- Source (job board)
- Date range
- Free-text search across role titles, company names, and notes

### Application state machine

Applications move through a formal set of states, not just visual columns. States determine what automations fire and what analytics are counted:

| State | Meaning |
|---|---|
| `discovered` | Found by the job discovery pipeline; not yet reviewed |
| `saved` | User has reviewed and shortlisted for potential application |
| `ready` | Resume tailored and application materials prepared; ready to submit |
| `applied` | Submitted; follow-up timer starts |
| `interviewing` | At least one interview confirmed |
| `offer` | Offer received |
| `closed` | Rejected / withdrew / declined — with sub-reason |

The state machine is what enables automation: moving to `applied` triggers the follow-up countdown; moving to `interviewing` cancels it; an email from the Smart Router automatically advances state based on detected intent.

### Bulk actions

Multi-select lets users act on many applications at once from a floating action bar:

- Bulk move to a different state
- Bulk skip / archive
- Bulk rescore (re-run AI suitability scoring)
- Bulk export selection to CSV

Keyboard support: select with row checkboxes or select-all, clear selection, fast bulk move-to-ready.

### Keyboard shortcuts

A complete keyboard-driven workflow for power users. Highlights:

- `Cmd+K` / `Ctrl+K` — global fuzzy search across title, company, location
- `@status` lock syntax to scope search to a specific state (e.g. `@applied stripe`)
- `?` — opens shortcut help dialog
- Tab-specific actions: skip, move to ready, mark applied without touching the mouse

### Manual JD import with AI extraction

Users can paste a raw job description from any source — company careers page, email, PDF, LinkedIn message — into the manual import panel. The AI extracts structured fields (title, employer, location, salary range, required skills) and populates the form for review. The user corrects any errors, then clicks import. The application is immediately scored against the user's profile.

This handles the significant share of job postings that exist outside supported job boards, without requiring users to fill in fields manually.

---

## 6. Networking & company research

One of the most consistent features across popular Notion templates is a dedicated networking and company research layer — separate from the per-application contact fields. This addresses a real pattern in active job searches: the same company or contact appears across multiple applications and touchpoints, and users need a single place to track the relationship over time.

### Networking CRM

A standalone contacts database linked to application cards. Each contact record captures:

- Name, role, and company
- Contact method (email, LinkedIn, phone)
- How the connection was made (referral, cold outreach, event, recruiter)
- Relationship status (to reach out / reached out / in conversation / warm / met in person)
- Notes and last interaction date
- Linked applications (which roles did this contact touch)

Contacts are not duplicated per application — a recruiter who touches three applications at the same company lives in one record, linked to all three. The networking CRM is filterable by relationship status, surfacing who needs follow-up independent of the application pipeline.

### Company profiles database

A separate company-level database that applications link to. Each profile captures:

- Company name, website, industry, and size
- User's personal interest rating (1–5)
- Notes on company culture, mission, recent news
- Open roles (linked applications)
- Key contacts at the company (linked from networking CRM)
- Glassdoor / Blind sentiment notes

This prevents duplication when a user applies to multiple roles at the same company, and supports the research phase before applying. Many top Notion templates treat company research as a first-class workflow step — users save companies of interest before any roles are open, and apply when positions become available.

### Salary research

A lightweight salary benchmarking field per application — expected salary, market rate for the role (sourced manually from Glassdoor, Levels.fyi, or similar), and the eventual offered salary. Aggregated across all applications, this builds a personal compensation dataset over time, helping users understand market positioning and negotiate with data.

---

## 7. Offer comparison

When multiple offers arrive simultaneously — which is the goal of a high-volume search — users need a structured way to compare them beyond salary figures. The offer comparison view is a dedicated matrix that normalises all active offers side by side.

### Comparison dimensions

| Dimension | Notes |
|---|---|
| Base salary | Annual, normalised to same currency |
| Equity | Vesting schedule, cliff, current valuation |
| Bonus | Target %, guaranteed vs discretionary |
| Benefits | Health, dental, 401k match, PTO days |
| Location flexibility | Fully remote, hybrid days, relocation required |
| Seniority & title | Level equivalency across companies |
| Team & manager | User's qualitative notes from interviews |
| Growth trajectory | Promotion timeline, company stage |
| Deadline | Offer expiry date |
| User score | Weighted composite based on user-defined priorities |

### Priority weighting

Users set weights (e.g. salary 40%, remote 30%, growth 30%) and the matrix computes a weighted score per offer. This is especially useful when the highest-paying offer is not the preferred one and the user needs to articulate the trade-off to themselves.

### Offer negotiation log

A per-offer log of negotiation history — initial offer, counter, company response, final accepted terms. Useful for future salary negotiations and for sharing de-identified data with peers.

---

## 8. Job search goals & consistency

Several popular Notion templates include a habit tracker or goal-setting layer for the job search itself. This addresses a real problem: job searching is a long, demoralising grind, and users who set weekly targets and track consistency are more likely to maintain momentum through a multi-month search.

### Weekly targets

Users set a weekly application target (e.g. 10 applications per week) and a networking target (e.g. 3 new connections per week). Progress is shown as a simple count against target, resetting weekly. This is not a streak system — a missed week does not penalise the user, it just shows a gap.

### Goal dashboard

A lightweight top-level view showing:

- Applications this week vs target
- Response rate trend (last 4 weeks)
- Networking contacts added this month
- Interviews scheduled upcoming
- Days since last offer received

This gives users a bird's-eye weekly check-in without requiring them to dig into individual application cards.

### Resource library

A saved links and materials section per job search — prep articles, role-specific study resources, salary research sources, and interview guides. Structured as a simple tagged list, filterable by role type or topic. Multiple Notion templates include this as a way to keep research organised alongside applications rather than scattered in browser bookmarks.

---

## 9. Resume builder (Reactive Resume v5 integration)

Rather than building a resume builder from scratch, JobTopBob integrates [Reactive Resume v5](https://rxresu.me) as a microservice. RxResume is an MIT-licensed open-source resume builder with 1M+ users that shares the same database engine (PostgreSQL) as JobTopBob. RxResume v5 uses its own auth system (not Better Auth) but supports custom OAuth/OIDC providers, enabling SSO with JobTopBob's Better Auth via OIDC configuration.

### What RxResume provides

- 13 built-in templates with CSS customisation, colour/typography control
- Full REST API with OpenAPI: `POST /resumes`, `GET /resumes/{id}/pdf`, JSON Patch updates
- API key auth (`x-api-key` header) for programmatic access
- Real-time preview, drag-and-drop section reordering
- Published JSON schema with sections for experience, education, skills, projects, custom sections
- PDF generation via headless Chromium printer service
- Custom OAuth/OIDC provider support (Google, GitHub, or any OIDC-compliant provider)
- MCP server endpoint at `/mcp` for AI-assisted resume editing
- Health check at `/api/health`
- Optional S3-compatible storage (falls back to local filesystem)
- Version history

### What JobTopBob owns

- Resume-to-application linking (which version was submitted where)
- Resume snapshot on application submit (saves RxResume JSON to JobTopBob DB)
- AI-powered resume tailoring suggestions (JobTopBob AI → RxResume API via JSON Patch)
- ATS keyword scoring (reads resume JSON, compares to JD)
- Resume A/B analytics (response rate by version)
- DOCX export (via `docx.js` in JobTopBob worker — RxResume supports PDF + JSON only)

### Resume versioning

Users maintain multiple resume variants tailored to different role types or industries in RxResume. Each version is named and stored independently. When applying for a role, users select which version to attach — JobTopBob snapshots the RxResume JSON at submission time and records it on the application card for later analytics.

### Trade-offs

- Adds 2 containers to the Docker stack (RxResume app + Chromium printer) — but removes the need for JobTopBob's own PDF generation infrastructure
- RxResume's template customisation is CSS-based, not a visual editor — sufficient for most users
- Auth is separate (RxResume v5 has its own auth system, not Better Auth) — Phase 2 SSO via OIDC bridges this gap
- Users interact with RxResume's UI for resume editing (can be embedded via iframe or linked) — deeper integration (SSO, seamless UI) follows in Phase 2

---

## 10. AI features

### Philosophy

AI features must enhance real experience, not fabricate content. Every proprietary tool's AI receives complaints about generic output — Teal's AI "just reworded keywords", Jobright hallucinated certifications that don't exist. JobTopBob's AI is grounded in the user's actual resume and the specific job description. Prompts are open source and auditable.

### BYOK model and LLM provider flexibility

All AI features support Bring Your Own Key. Two provider implementations cover all models:

- **OpenAI-compatible** — supports OpenAI directly (GPT-4o, GPT-4 Turbo), plus Anthropic (Claude), Gemini, and 100+ other models via [OpenRouter](https://openrouter.ai) (which uses the OpenAI API format). Users set a different `base_url` in their API key config to target OpenRouter.
- **Ollama** — local models with zero API key requirement, fully offline. Uses the OpenAI-compatible `/v1/chat/completions` endpoint internally.

This delivers identical model coverage with 2 provider implementations instead of 5. Native Anthropic/Gemini providers should only be added if users report latency or feature gaps from OpenRouter passthrough.

When a BYOK key is configured, all AI requests use the user's key directly — no AI costs are incurred by the platform. API keys are stored per-provider in a dedicated `user_api_keys` table (encrypted at rest), so switching providers does not lose previous keys. Task-specific model overrides let power users assign a cheaper model to high-volume tasks (e.g. suitability scoring) and a more capable model to lower-frequency tasks (e.g. cover letter generation).

The cloud paid tier offers managed AI as a convenience alternative: no key or account required.

Local model support via Ollama is self-hosted only. This serves privacy-maximalist users who want zero data leaving their machine — every AI operation runs entirely on local hardware.

### AI suitability scoring (pre-apply)

Before a user decides whether to apply to a discovered role, the AI scores the job against their profile on a 0–100 scale with a plain-language explanation of the fit. This is distinct from ATS scoring (which checks a resume against a JD at application time) — suitability scoring is a triage tool for the discovery phase.

Configurable thresholds let users set a minimum score below which jobs are auto-deprioritised. Pipeline runs can be set to only surface jobs above a score threshold, reducing review burden at high application volume.

### AI resume tailoring

Given a job description and a base resume version, the AI:

1. Identifies keywords and requirements in the job description
2. Scores the current resume against ATS keyword matches
3. Suggests rewordings of existing bullet points to better reflect relevant experience
4. Flags missing keywords without inventing experience

The output is always grounded in the user's existing content. The AI rewrites and reframes — it does not add skills or certifications the user has not listed.

### ATS keyword scoring

A score (0–100) showing how well a given resume version matches a specific job description. Broken down by section (skills, experience, summary) with specific missing keywords highlighted. Available per-application from the application card.

### AI cover letters

Generates a draft cover letter using the resume version and job description as inputs. Controls available:

- Tone (professional, conversational, formal)
- Length (short / standard / detailed)
- Emphasis (skills-led, experience-led, mission-driven)

The draft is editable before saving. Cover letters are stored per application.

### Ghostwriter

A persistent, per-job AI conversation attached to every application card. Unlike the discrete AI features above (tailoring, cover letters, interview prep), Ghostwriter is an open-ended assistant — the user can ask anything about the role, the company, their application strategy, or request new drafts mid-conversation.

Key behaviours:

- One conversation thread per job, persisted across sessions
- Streaming responses with stop and regenerate controls
- Markdown rendering for structured outputs (bullet lists, tables, code)
- Context includes the job description snapshot, the user's resume, and the full conversation history
- Writing style settings (formal/conversational, verbose/concise) apply globally and affect Ghostwriter output

Ghostwriter is the interface for users who want more than a button-click — it supports the exploratory, open-ended work of figuring out how to position yourself for a specific role.

### Interview prep

Given the job description and company name, generates:

- Role-specific likely interview questions (technical and behavioural)
- A one-page company research brief (recent news, mission, product focus)
- Answer feedback rubric aligned to the role's stated requirements

### Smart Router (Gmail auto-status)

The Smart Router is an AI agent that watches the user's Gmail inbox for post-application signals and automatically updates job statuses:

- "We'd like to schedule an interview…" → state advances to `interviewing`
- "We've decided to move forward with other candidates…" → state advances to `closed: rejected`
- "We're pleased to extend an offer…" → state advances to `offer`

Setup requires Gmail OAuth. The Smart Router routes detected emails to the correct application card by matching company name and role. All routing decisions are shown in a Tracking Inbox view where users can confirm, correct, or override the AI's interpretation before the state change is committed.

Privacy: the Smart Router reads email metadata and body text to perform routing. No email content is stored beyond what is needed to update the application record. The Tracking Inbox shows a full audit log.

### Manual JD import with AI extraction

Covered in section 5. The AI extraction also immediately runs suitability scoring on the imported job, so users get a fit score on any role they paste in, regardless of source.

### Transparency

All AI prompts are in the open-source repository. Users can inspect exactly what instructions are sent to the model. This is a structural trust advantage over proprietary tools where prompt logic is a black box.

---

## 11. Privacy & data ownership

### Self-hosting

The full application stack is self-hostable via Docker Compose. A self-hosted instance has no connection to JobTopBob's servers. All data remains on the user's own infrastructure.

### Data export

Full data export is available at any time to all users, including cloud subscribers. Export formats:

- JSON (complete data model, suitable for re-import)
- CSV (applications, contacts, notes as separate files)

There is no export fee, no waiting period, and no data held hostage on account cancellation.

### What is not collected

- Resume content is never used to train models
- Resume data is never sold to third parties or data brokers
- No advertising or third-party tracking scripts
- Browser extension requests only the permissions needed to add a job from a job board page — not broad "read all pages" access

### Licence and audibility

The codebase is AGPL-3.0. Anyone can audit exactly how data is handled, what is stored, and what is transmitted. Privacy is not a policy claim — it is a verifiable property of the code.

---

## 12. B2B & institutional tier

### Target customers

- Coding bootcamps (validated market — Huntr and Careerflow already sell to these)
- University career centres
- Workforce development and re-employment programmes
- Outplacement firms

### What institutions need

Institutions are less interested in AI resume features than in outcome reporting for accreditation and grant compliance. The B2B value proposition is:

- Cohort dashboard: aggregate placement rates, time-to-offer, application volume across all students
- Advisor access: staff can view and annotate student job search progress
- White-label branding: custom domain, logo, and colour scheme
- SSO / SAML: integrates with institutional identity providers
- Exportable outcome reports: formatted for accreditation bodies and grant reporting requirements
- Bulk user management: cohort import/export, role assignment

### Pricing

B2B contracts are annual, priced between $5,000 and $50,000 depending on cohort size and feature requirements. This is a validated price range — both Huntr and Careerflow sell at these levels to similar customers.

### Cloud multi-tenancy additions

The `MULTI_TENANT=true` flag enables:

- Organisation creation and member invitation flows
- Plan enforcement middleware (checks active subscription and credit balance before allowing usage)
- AI credit metering (credit consumption per operation per billing period)
- Stripe billing integration

All multi-tenant logic is present in the repo (AGPL) but inactive when `MULTI_TENANT=false`. Self-hosters who want to run a multi-user instance for their team can enable it — the billing parts require Stripe keys and are clearly optional.

### What is cloud-only (not locked, just not packaged)

- **Billing / Stripe integration** (`packages/cloud/billing`) — present in repo, inactive when `BILLING_ENABLED=false`. Self-hosters who want to charge their users can configure it.
- **Managed AI key pool** — the platform's API keys are not in the repo. Self-hosters supply their own.
- **Cloud infrastructure configs** — Terraform/Pulumi for the Vercel/Railway/Neon stack. Not relevant to self-hosters.
- **B2B admin tooling** — internal dashboard for managing org accounts, viewing aggregate metrics, support tooling. Not open source; not user-facing.

### Enterprise-only features

These items are targeted for milestone 3.3 (months 12–18):

- White-label: custom domain, logo, colour scheme per organisation
- Employer-facing portal: orgs can post roles directly into the tracker for their students
- Data residency options (EU-only Postgres region)
- Commercial licence for AGPL-exempt procurement compliance

### Sales enablement (milestone 3.4)

- Self-serve org signup with trial (14-day full access)
- Stripe B2B invoicing (annual contracts, PO support)
- Admin dashboard: org management, usage, billing
- Onboarding materials for institution admins
- First 3 paying institutional customers

### B2B timeline

B2B institutional sales should be pursued by month 12 at the latest. Individual premium subscriptions alone — with sub-2% conversion rates typical for this audience — cannot sustain serious development. B2B contracts provide the revenue stability needed to grow the core product.

---

## 13. Licensing

### AGPL-3.0

The codebase is licensed under the GNU Affero General Public License v3.0. This requires anyone who hosts a modified version of the software to publish their source code under the same licence.

This choice:

- Protects against competitive hosted forks that take the code proprietary
- Keeps the codebase fully open and auditable
- Is the same licence used by Cal.com, Plane.so, AppFlowy, and Twenty CRM for the same reasons

### Commercial licence

Institutions requiring a commercial licence (e.g. for procurement compliance that prohibits AGPL) can purchase one separately. This is a standard open-core commercial arrangement.

### Commons Clause decision

job-ops uses AGPL + Commons Clause (prohibits selling hosted services based on the software). JobTopBob deliberately uses pure AGPL-3.0 without Commons Clause.

The reasoning: Commons Clause creates friction with enterprise procurement (many legal teams block any Commons Clause software) and signals distrust of the community. Pure AGPL already protects against competitive forks taking the code proprietary — anyone hosting a modified version must publish their changes. A hosting provider who copies JobTopBob and offers it as a service must publish all their modifications, which removes their competitive moat. That protection is sufficient.

---

## 14. Competitive landscape

| Product | Type | Price | Users | Key weakness |
|---|---|---|---|---|
| Teal | Proprietary SaaS | $29/mo | 2M+ | Negative Reddit sentiment on paid tier; data concerns |
| Huntr | Proprietary SaaS | $40/mo | — | No data export; expensive for unemployed users |
| Simplify | Proprietary SaaS | $39.99/mo | 1M+ Chrome installs | Broad permissions; no trial; no refund |
| Jobright.ai | Proprietary SaaS | Freemium | 520K | AI hallucination reports; billing complaints |
| Reactive Resume | Open source | Free | 1M+ | Resume only; no tracker; donation model unsustainable |
| OpenResume | Open source | Free | — | Resume only; no tracker |
| job-ops | Open source (AGPL) | Free / self-host | 1.4K stars | Discovery + tracking only; no resume builder; no B2B tier |
| Notion templates | Spreadsheet | Free | Massive | Breaks at scale; no automation; no analytics |

**The gap:** No open-source project with meaningful traction combines a full-featured resume builder with job application tracking, automated discovery, and a commercial B2B tier. job-ops is the closest open-source comparator but intentionally omits the resume builder and has no hosted offering.

---

## 15. Notion template analysis

Notion hosts 500+ job tracking templates and represents the first tool most job seekers try before graduating to a dedicated product. Analysing the most popular templates reveals both the features users value and the gaps that create migration demand.

### What Notion templates do well

**Networking and company research as first-class workflows.** The most popular templates (Career Manager, Job Tracking Kit, CareerOS) all treat networking as a separate database, not a sub-field of an application. Users track contacts, outreach cadence, and relationship warmth independently from the application pipeline. This is a pattern JobTopBob should adopt directly.

**Company profiles before applications.** Multiple templates include a company wishlist or research database that predates any specific application. Users save companies of interest, research them, and wait for roles to open — rather than only logging companies when actively applying. This "top of funnel" behaviour is unserved by most dedicated trackers.

**Structured offer comparison.** Several templates include dedicated offer comparison tables with weighted scoring across salary, equity, benefits, and growth. This is consistently underbuilt in proprietary tools, which treat the offer stage as an afterthought.

**Interest and priority scoring per application.** Most templates let users rate their own interest in a role (typically 1–5 stars). This feeds prioritisation — users focus prep effort on high-interest roles and deprioritise long shots. No current dedicated tracker surfaces this prominently.

**Goal setting and consistency tracking.** Templates like Habit Tracker for Job Seekers and the CareerOS goal-setting module address the psychological dimension of job searching — setting weekly targets, tracking consistency, and maintaining momentum. This is entirely absent from proprietary tools.

**Resource library as part of the workflow.** Saving prep materials, salary research links, and interview guides alongside applications is a common pattern. Users do not want to context-switch to browser bookmarks mid-workflow.

**Calendar view for interviews.** Multiple templates let users sort and filter by due dates on a calendar, treating interview scheduling as a first-class view rather than a secondary filter.

### What Notion templates cannot do

These are the gaps that drive users away from Notion and toward dedicated tools — and JobTopBob's primary differentiation points:

- No JD archiving — job descriptions must be manually copied before postings expire
- No auto-calculated follow-up reminders — users must manually set dates
- No resume builder or version tracking — resume management is entirely separate
- No AI integration beyond Notion AI (which is generic, not job-search-specific)
- No ATS scoring or resume-to-JD matching
- Performance degrades significantly at 100+ applications
- No response rate analytics or stage funnel visualisation
- Setup requires significant manual configuration — not accessible to non-technical users

### Features adopted from Notion template research

The following features were added to the JobTopBob spec as a direct result of this analysis:

| Feature | Source insight |
|---|---|
| Networking CRM (standalone) | Career Manager, Job Tracking Kit, CareerOS all treat contacts as a separate database |
| Company profiles database | Pre-application research and company wishlist behaviour appears in multiple top templates |
| Offer comparison matrix with weighting | Job Search ($3) template by Marco Elizalde; structured comparison is consistently underbuilt in dedicated tools |
| Interest/priority scoring per application | Common field across most templates; drives effort allocation |
| Salary tracking (expected + offered + market) | Job Search OS, Pay Rates dashboard; users want personal compensation data over time |
| Calendar view for interviews | Notion's own Job Application Tracker (w/ AI) surfaces this as a primary view |
| Weekly goal targets and consistency dashboard | Habit Tracker template; CareerOS goal-setting module |
| Resource library | Job Tracking Kit, CareerOS; users want prep materials in-context |

---

## 16. job-ops analysis

job-ops (github.com/DaKheera47/job-ops) applies DevOps pipeline thinking to job hunting. With 1.4K GitHub stars, active maintenance, a full documentation site, and seven versioned releases, it is the most technically sophisticated open-source job-search tool currently available. Its architecture is meaningfully different from JobTopBob's intended design — and studying it surfaces several features worth adopting directly.

### What job-ops does

job-ops is a self-hosted pipeline that performs universal scraping across LinkedIn, Indeed, Glassdoor, Adzuna, Hiring Café, Gradcracker, and UK Visa Jobs; ranks jobs by fit using a configurable LLM; generates tailored resume PDFs per application; and connects Gmail to auto-detect interviews, offers, and rejections.

The core workflow is: Search → Score → Tailor → Export → Track. The pipeline run accepts configurable parameters for how many top jobs to process and a minimum suitability score threshold, enabling users to control discovery volume and quality.

The manual extractor accepts a pasted job description from any source, sends it to an LLM to extract structured fields (title, employer, location, salary), and immediately runs suitability scoring — enabling import from sources outside supported job boards.

The post-application workflow splits into pre-application and post-application phases, with the Smart Router AI watching the inbox for recruiter replies and auto-updating job states; a Tracking Inbox lets users confirm or override the AI's routing decisions.

### What job-ops deliberately omits

job-ops has no resume builder. It integrates with RxResume as an external dependency for PDF generation — users must maintain a separate RxResume account. This is a conscious scope decision: job-ops focuses on the discovery and pipeline automation layer.

It also has no B2B tier, no cloud hosted version (though one is planned according to the README), no networking CRM, no offer comparison, and no goal-tracking layer. The analytics are application-funnel focused rather than career-progression focused.

The licence is AGPL + Commons Clause, which explicitly prohibits selling hosted services whose value derives substantially from job-ops. This is a more restrictive stance than pure AGPL and would prevent a fork from being offered as a commercial hosted product without a commercial licence agreement.

### Features adopted from job-ops

| Feature | How it was incorporated |
|---|---|
| Automated job discovery pipeline | Added to section 3 (feature set) and section 17 (roadmap phase 2); scraping from multiple job boards brings jobs to the user rather than requiring manual entry |
| AI suitability scoring (pre-apply) | Added to section 10 (AI features); distinct from ATS scoring — this is a triage tool for deciding what to apply to, not a resume optimiser |
| Application state machine | Added to section 5; formal states (`discovered`, `ready`, `applied`, etc.) enable automation and analytics that Kanban columns alone cannot |
| Ghostwriter (per-job AI chat) | Added to section 10; persistent open-ended AI conversation per application, distinct from discrete AI buttons |
| Smart Router / Gmail auto-status | Expanded the existing email integration entry in section 10; AI routing with a confirmation inbox is more specific and trustworthy than generic email parsing |
| Manual JD import with AI extraction | Added to section 5 and 10; handles job postings from company career pages, emails, and other non-scraped sources |
| LLM provider flexibility + local models | Expanded BYOK section in section 10; Ollama/LM Studio support for fully offline, privacy-maximalist self-hosting |
| Bulk actions and keyboard shortcuts | Added to section 5; power-user workflow features validated by an actively used codebase |
| Conversion funnel analytics | Added to feature set table; applications-per-day trend and funnel view with time-window controls |
| Webhook support | Added to feature set table; useful for power users and B2B automation integrations |
| Read-only / public share mode | Added to feature set table; lets users share their job search dashboard publicly while protecting write actions |
| Backup scheduling and retention | Noted in section 11 (privacy); automatic backup management for self-hosted instances |

### Key design differences

job-ops is pipeline-first: it runs on a schedule, discovers jobs autonomously, and surfaces a ranked list for the user to review. JobTopBob is tracker-first: the primary interface is the application board, and discovery is an optional additive layer. Both approaches are valid for different users — JobTopBob should offer both modes, letting users choose whether to drive discovery manually (browser extension, manual import) or enable the automated pipeline.

The pipeline approach creates a qualitatively different product experience for high-volume searchers. Rather than spending time finding and evaluating job listings, the user wakes up to a pre-scored, pre-tailored queue. The cost is setup complexity — users must configure scraping targets, LLM keys, and scoring thresholds upfront. JobTopBob should make this opt-in with sensible defaults, not the only mode.

---

## 17. Roadmap priorities

### Phase 1 — Foundation (months 1–6, 14–16 weeks)

- Core application tracker with Kanban, list, table, and calendar views
- Application state machine (`discovered` → `saved` → `ready` → `applied` → `interviewing` → `offer` → `closed`)
- Custom stages (renameable/reorderable Kanban columns via `stages` table)
- Reactive Resume v5 integration as resume builder microservice (13 templates, PDF export, REST API)
- Resume-to-application linking with JSON snapshot on submit
- JD archiving with auto-snapshot
- Manual JD import with AI extraction (paste any job description; AI parses fields)
- Interest/priority scoring per application card
- Tags and labels (polymorphic tagging across jobs, contacts, companies)
- Activity log (audit trail for timeline view and future B2B compliance)
- Basic analytics (response rate, stage distribution, applications-per-day trend)
- Networking CRM (contacts database linked to applications)
- Company profiles database
- Bulk actions and keyboard shortcuts
- Self-hosting via Docker Compose with backup scheduling
- BYOK AI integration (OpenAI-compatible + Ollama — 2 provider implementations covering all models)
- Per-provider API key storage (encrypted, supports multiple keys simultaneously)
- Full data export (JSON/CSV)

### Phase 2 — Growth (months 6–12)

#### Milestone 2.1 — Cloud infrastructure (weeks 1–3)

- Vercel project setup with environment variable management
- Neon database provisioning with staging + production branches
- Railway worker deployment
- Upstash Redis provisioning
- Cloudflare R2 bucket + CDN
- Resend transactional email setup
- `MULTI_TENANT=true` mode: RLS policies, tenant context middleware
- Managed AI key pool (platform keys, not user-supplied)
- Stripe integration: Pro plan subscription, webhook handling
- Cloud landing page and sign-up flow

#### Remaining phase 2 priorities

- Automated job discovery pipeline (LinkedIn, Indeed, Glassdoor, Adzuna, and others) — scrapers as stateless HTTP services; bot-hostile boards use Hyperbrowser cloud sessions, others use self-hosted Playwright or fetch()
- AI suitability scoring with configurable threshold and pipeline run controls
- Ghostwriter (persistent per-job AI conversation with streaming responses)
- Browser extension (one-click add from job boards)
- Smart Router: Gmail OAuth integration with AI routing and Tracking Inbox confirmation
- Advanced analytics (resume A/B, response rate by source, time-in-stage, conversion funnel)
- AI cover letters and interview prep
- Deeper RxResume integration (SSO via OIDC, AI tailoring via MCP/JSON Patch, ATS scoring against resume JSON)
- Offer comparison matrix with priority weighting
- Salary tracking (expected, offered, market rate)
- Weekly goal targets and consistency dashboard
- Resource library
- Webhook support for job state changes
- Read-only / public share mode
- Cloud hosted version with managed AI
- Paid cloud tier launch
- Evaluate adding native Anthropic/Gemini AI providers if OpenRouter passthrough shows issues

### Phase 3 — B2B (months 12–18)

- Cohort dashboard for institutional customers
- SSO / SAML integration
- White-label branding
- Exportable outcome reports
- First B2B institutional contracts

#### Milestone 3.3 — Enterprise features (weeks 5–10)

- SSO: SAML 2.0 + OIDC (via Better Auth enterprise plugin)
- SCIM provisioning for bulk user management
- White-label: custom domain, logo, colour scheme per organisation
- Employer-facing portal: orgs can post roles directly into the tracker for their students
- Custom AI system prompt per organisation (e.g. "Focus on entry-level engineering roles")
- Data residency options (EU-only Postgres region)
- Commercial licence for AGPL-exempt procurement compliance

#### Milestone 3.4 — Sales enablement (weeks 8–12)

- Self-serve org signup with trial (14-day full access)
- Stripe B2B invoicing (annual contracts, PO support)
- Admin dashboard: org management, usage, billing
- Onboarding materials for institution admins
- First 3 paying institutional customers

---

---

## 18. Cloud infrastructure & deployment

The cloud service runs the same application code as the self-hosted version, with infrastructure-level additions.

### Infrastructure stack

| Component | Service | Notes |
|---|---|---|
| Frontend (Next.js) | Vercel | Edge-optimised; handles auth + SSR |
| Go API | Railway | Always-on container; scales horizontally |
| Go worker | Railway | Always-on; Asynq cron + task processing |
| TypeScript scrapers | Railway | One service per scraper; LinkedIn/Glassdoor are lightweight when using Hyperbrowser (no local Chromium needed) |
| Database | Neon (serverless Postgres) | Branching for staging; built-in connection pooling |
| Redis | Upstash | Serverless Redis; Asynq + rate limiting |
| File storage | Cloudflare R2 | Zero egress fees |
| Email | Resend | Transactional email |
| Monitoring | Sentry + PostHog | Error tracking + product analytics |
| Billing | Stripe | Subscriptions, usage metering, B2B invoicing |

### Configuration: cloud vs self-hosted

Same binary, same behaviour, different environment:

| Config key | Self-hosted default | Cloud value |
|---|---|---|
| `AI_PROVIDER` | `openai` (user's BYOK key via OpenAI-compatible) | `openai` (platform key via OpenRouter) |
| `DATABASE_URL` | `postgres://localhost/jobtopbob` | Neon managed Postgres |
| `REDIS_URL` | `redis://localhost:6379` | Upstash Redis |
| `STORAGE_DRIVER` | `local` or `minio` | Cloudflare R2 |
| `BILLING_ENABLED` | `false` | `true` |
| `MULTI_TENANT` | `false` | `true` |
| `SCRAPERS_ENABLED` | `false` | configurable per user |

### Multi-tenant isolation

- Each user's data is isolated by RLS policies in Postgres
- AI API calls use either the user's BYOK key or the platform's key depending on plan
- Usage metering tracks AI calls per user per billing period; enforced at the middleware layer
- B2B organisations get a dedicated Postgres schema for stronger isolation (optional; configurable)

### Deployment pipeline

```
main branch push
  → GitHub Actions
      → Go: go vet + staticcheck + go test ./...  (api + worker)
      → TypeScript: tsc + eslint + vitest  (web + scrapers + packages)
      → OpenAPI: validate spec + check generated client is up to date
      → sqlc: check generated Go is up to date
      → build Docker images (Go binaries via multi-stage build; scrapers via node:20-slim)
      → push to GitHub Container Registry
  → Vercel preview deploy (Next.js — automatic on PR)
  → on release tag:
      → staging deploy (Railway + Vercel) + smoke tests
      → production deploy
      → run golang-migrate against Neon
```

---

*Documentation version 0.4 — updated with feasibility assessment recommendations: Reactive Resume v5 integration, 2 AI providers (OpenAI-compatible + Ollama), per-provider API key storage, custom stages, activity log, tags, and latest framework versions.*