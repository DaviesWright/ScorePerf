# ScoReview Performance & HRMS: Senior Engineering Handover

| Metadata | Details |
|---|---|
| **Project** | ScoReview Enterprise HRMS & Performance Platform (ScoReviewHR) |
| **Date** | 2026-11-03 |
| **Handover Author** | Senior Edge Systems Architect (AI Agent Pair with `paa.barnes`) |
| **Repository** | `c:\Users\paa.barnes\Downloads\07 Deployments\ScoRePerf` (remote `origin` = `DaviesWright/ScorePerf`, branch `main-custom`) |
| **Active Stack** | **Cloudflare SaaS Edge Monorepo (`hr-platform/`)** + Neon Lakebase Managed PostgreSQL (`aws-eu-west-2`) |
| **Live Environment** | API: `http://localhost:8787` • Jobs/Workflows: `http://localhost:8788` • Frontend: `http://localhost:3000` |
| **Active Tenant** | Senrab ConsulTech (Tenant ID: `1`, Domain: `senrab.com`, 45 active staff members, 54 tracked assets) |

---

## 1. Decisions Made & Rationale

All major architectural and operational decisions were directed and approved by project owner **paa.barnes** on 2026-11-03.

| # | Decision | Why It Was Chosen | Alternatives Considered & Rejected |
|---|---|---|---|
| **1** | **Cloudflare SaaS Edge Monorepo (`hr-platform/`) (ADR-0015)** | Delivers 0ms cold starts, <15ms global edge latency, durable state workflows, and serverless message queues with zero daemon/container maintenance overhead. | • *Django Monolith + Celery + Redis in Docker Containers (ADR-0006/0007)*: Rejected due to heavy container patching, idle compute costs, and multi-process failure modes.<br>• *AWS Lambda + Step Functions*: Rejected due to VPC cold starts and higher complexity. |
| **2** | **External Managed PostgreSQL (Neon Lakebase) via Cloudflare Hyperdrive** | Provides production PostgreSQL with autoscaling, database branching, and sub-millisecond edge query acceleration via Hyperdrive TCP connection pooling. | • *Direct TCP to AWS RDS*: Rejected due to edge connection exhaustion.<br>• *SQLite / Cloudflare D1*: Rejected due to relational schema depth requirements (37 tables, foreign keys, triggers). |
| **3** | **13-Module Enterprise HRMS Suite Scope Expansion** | Transforms ScoReview from a standalone PMS into a full-scale Human Resource Management Suite, preventing data fragmentation across separate tools. | • *PMS-only microservice*: Rejected because employee master data, shifts, leaves, assets, and tickets belong to the same organizational domain model. |
| **4** | **Company 1 Branding as Senrab ConsulTech (`senrab.com`)** | Establishes a realistic, high-fidelity enterprise consulting firm with 43 employees across 7 corporate departments, with all emails using `@senrab.com`. | • *Generic Demo Data ("Acme Global")*: Rejected to provide immediate business relevance and showcase realistic organizational hierarchies. |
| **5** | **Total Suppression (Without Purging) of 4 Modules** | Hides Recruitment, Onboarding, Offboarding, and Payroll from UI dashboards and marks them suppressed in the API, while preserving all schema definitions and tables intact. | • *Hard drop / delete of tables*: Rejected because foreign key constraints link to employees and departments, and future activation will be required. |
| **6** | **Strict Framework Purity per Appraisal (ADR-0016)** | Requires choosing either OKR, MBO, or BSC per cycle; locks the framework permanently once selected; strictly prohibits mixing frameworks within any single appraisal. | • *Allowing mixed OKR + BSC in one cycle*: Rejected because conflicting mathematical scoring rules invalidate calibration distributions and confuse reviewers.<br>• *Allowing mid-cycle framework switching*: Rejected due to audit distortion. |
| **7** | **OpenNext Worker Deployment for Next.js 15 App Router** | Packages modern Next.js React Server Components directly into a Cloudflare Workers bundle (`.open-next/worker.js`) for edge SSR. | • *Static export only*: Rejected because a dynamic, token-derived tenant context and server-side data fetching are required. |

---

## 2. Current State of Work

*Verification standard: "Complete" means verified against running code, network HTTP responses, or live database inspection.*

| Component / Deliverable | Status | Evidence & Verification |
|---|---|---|
| **Neon PostgreSQL Database** | **Complete (100%)** | 37 relational tables verified in Neon DB (`wandering-brook-44207206`, `aws-eu-west-2`) via `schema.sql`. |
| **Hyperdrive Configuration** | **Complete (100%)** | Hyperdrive ID `d1468c75b19f437b994c969eb1fa2b41` (`hr-db`) bound to Workers. Local dev connection verified via real Neon connection string. |
| **Edge API Gateway (`apps/hr-api`)** | **Complete (100%)** | Hono server running on `http://127.0.0.1:8787`. Verified endpoints for employees, cycles, leaves, assets, tickets, projects, and documents. |
| **Jobs & Workflows Worker (`apps/hr-jobs`)** | **Complete (100%)** | Worker running on `http://127.0.0.1:8788`. Queue consumer and `PerformanceReviewWorkflow` entrypoint verified. |
| **Frontend Enterprise Shell (`apps/hr-frontend`)** | **Complete (100%)** | Next.js 15 App Router running on `http://localhost:3000`. Linear/Stripe design tokens, collapsible navigation shell, slide-over HCM profile drawer, 8 interactive modules, 0 TypeScript errors, OpenNext edge worker build verified (`.open-next/worker.js`). |
| **Workforce Seeding** | **Complete (100%)** | 45 employees with `@senrab.com` emails across 7 departments seeded (including Benedicta Asante & Philip Mensah) and verified via `GET /api/v1/employees` (Count: 45). |
| **Asset Coverage** | **Complete (100%)** | 54 enterprise hardware assets allocated across 100% of the 45-member workforce; verified via `GET /api/v1/assets` (Count: 54). |
| **Module Suppression** | **Complete (100%)** | Recruitment, Onboarding, Offboarding, and Payroll suppressed from UI matrix and API directory; API returns `{ suppressed: true }`. |
| **Framework Governance & Immutability** | **Complete (100%)** | PostgreSQL trigger `trg_cycle_framework_immutable` active. API rejects mixed payloads (`422`) and framework mutations (`400`). |
| **Edge API Authentication & Tenant Derivation** | **Complete for the API; frontend not migrated** | 2026-11-03. Before: any caller sending `X-Company-ID` (and no credentials) got the tenant's employee records, and `X-User-Role` defaulted to `hr_director`. Now: signed bearer token required on every `/api/v1/*` route; tenant, user and role come from its claims. `apps/hr-api/test` (17 tests) and live checks against `:8787` pass: no token 401, header-only 401, forged or expired token 401, spoofed `X-Company-ID` ignored, employee token cannot reach payroll. Token issuer (identity provider) and the frontend login are still open. |
| **Async Score Calculation Logic** | **In Progress (60%)** | Queue message structure defined (`JobMessage`); mathematical calculation logic inside worker needs porting from Python prototype. |
| **Master Data CSV Streaming Ingestion** | **In Progress (30%)** | Database tables ready; multipart streaming endpoint in `apps/hr-api` needs implementation. |
| **Hardware Biometric Webhook** | **Not Started (0%)** | Schema supports shifts and time punches; external webhook ingestion endpoint not yet authored. |

---

## 3. Open Questions & Required Inputs

1. **Scoring Normalization**: When scoring MBO appraisals, how should unrated or missing SMART objectives be handled—should they be excluded with weight renormalization, or scored as zero?
2. **Balanced Scorecard Perspective Weights**: Should all four BSC perspectives default to 25% weight each, or should department heads be allowed to configure perspective weightings?
3. **Session Authentication & IdP**: Decided: magic link backed by KV (built in `apps/hr-api`, see BUILD.md §16.2). Still open: the mail provider that sends the links, and whether a client later wants Google Workspace / Microsoft Entra SSO instead.
4. **Document Binary Storage**: Will employee contracts remain as metadata pointers in PostgreSQL, or should Cloudflare R2 bucket bindings be provisioned for PDF storage?
5. **Suppressed Modules Roadmap**: When are the executive stakeholders planning to un-suppress Payroll and Recruitment—are they awaiting third-party PSP/payroll provider selection?
6. **Legacy Django Codebase Lifecycle**: Should the legacy Django files in the root directory (`horilla/`, `pms/`, `venv/`) be archived into a `/legacy` folder or deleted from git tracking to prevent developer confusion?

---

## 4. Files Touched

### Created
- `hr-platform/`: Complete Cloudflare SaaS Edge Monorepo.
  - `packages/shared/src/types.ts`: TypeScript domain models for all 13 HRMS domains.
  - `packages/shared/src/schemas.ts`: Zod validation schemas for cycles, appraisals, leaves, assets, and tickets.
  - `db/schema.sql`: 37-table PostgreSQL schema with enum types and `trg_cycle_framework_immutable` trigger.
  - `apps/hr-api/src/index.ts`: Hono edge API with multi-tenancy, framework purity enforcement, and 12 route groups.
  - `apps/hr-jobs/src/index.ts`: Cloudflare Queues consumer and durable `PerformanceReviewWorkflow`.
  - `apps/hr-frontend/src/app/page.tsx`: Server-rendered Next.js dashboard with module matrix, framework badges, and project feeds.
  - `apps/hr-frontend/open-next.config.ts`: OpenNext edge build configuration for Cloudflare Workers.
- `docs/architecture/adr/0015-cloudflare-saas-edge-architecture.md`: Architectural Decision Record for Cloudflare edge migration.
- `docs/architecture/adr/0016-single-framework-appraisal-purity.md`: Architectural Decision Record for single framework purity and anti-mixing rules.
- `ScoReviewHR Roadmap.md`: Comprehensive 10-section product roadmap and governance document.

### Modified
- `BUILD.md`: Amended to reflect Cloudflare SaaS Edge monorepo architecture, 13-module enterprise scope map, and ADR-0015/ADR-0016.
- `.gitignore`: Updated to ignore `.neon/` CLI state, local logs, and temporary seed scripts.
- `docs/HANDOVER.md`: Fully updated to this senior engineering transition specification.

### Deleted
- Temporary seed scripts (`seed_senrab.mjs`, `apply_trigger.mjs`): Cleaned up post-execution to preserve repository cleanliness.

---

## 5. Continuation Guide for the Incoming Engineer

### 5.1 Environment Prerequisites
- **Node.js**: v20+ or v22+ (tested with Node v26.13.0 on Windows 11).
- **Cloudflare Wrangler CLI**: `npm install -g wrangler` (authenticated via `npx wrangler whoami`).
- **Neon CLI (Optional)**: Linked to project `hr-platform-db` (`wandering-brook-44207206`), branch `production`.

### 5.2 Starting Local Development
From the workspace root:
```bash
cd hr-platform
npm install
npm run dev
```
This concurrently launches all three services:
- **`apps/hr-api`**: `http://localhost:8787` (Hono Edge REST API)
- **`apps/hr-jobs`**: `http://localhost:8788` (Cloudflare Queues & Workflows Engine)
- **`apps/hr-frontend`**: `http://localhost:3000` (Next.js Dashboard via Next dev / OpenNext)

### 5.3 Key Architectural Gotchas
1. **Authentication & Tenancy**: All requests to `apps/hr-api` under `/api/v1/*` **require** `Authorization: Bearer <JWT>` (HS256, signed with the `AUTH_JWT_SECRET` Worker secret). The tenant (`company_id`), user (`sub`) and `role` are read from the token. `X-Company-ID`, `X-User-ID` and `X-User-Role` headers are ignored; a missing or invalid token returns `401`. Locally the secret lives in `apps/hr-api/.dev.vars` (gitignored; create it with `AUTH_JWT_SECRET=` followed by 32+ random characters) and `npm run token --workspace=apps/hr-api -- --role hr_director --company 1 --user 1` prints a dev token. For Cloudflare, run `npx wrangler secret put AUTH_JWT_SECRET` in `apps/hr-api` first. **The frontend (`apps/hr-frontend`) still sends `X-Company-ID: 1` and has no login, so its API calls return `401` until the identity provider (open question 3) is decided and wired in.** Tests: `npm test --workspace=apps/hr-api`.
2. **Framework Immutability**: Do NOT attempt to alter `framework_type_id` on an existing cycle via `PATCH /api/v1/cycles/:id`. The API will reject it with `400`, and the PostgreSQL trigger `trg_cycle_framework_immutable` will reject direct SQL updates.
3. **Appraisal Framework Purity**: When submitting appraisals via `POST /api/v1/appraisals`, the payload must match the cycle's framework (`okrPayload` for OKR, `mboPayload` for MBO, `bscPayload` for BSC). Mixing payloads returns `422 Unprocessable Entity`.
4. **Hyperdrive Local Connection**: In `wrangler.jsonc` (both in `apps/hr-api` and `apps/hr-jobs`), `localConnectionString` points directly to the real Neon database string so that local development mirrors live PostgreSQL behavior identically.
5. **No `Co-Authored-By` Trailers**: Never add `Co-Authored-By` trailers in commit messages per workspace governance guidelines.

### 5.4 Immediate Next Steps
1. **Implement Score Calculation Algorithm**: Open `apps/hr-jobs/src/index.ts` and flesh out the queue message handler for `score_calculation`.
2. **Build CSV Master Data Ingest Handler**: Implement multipart file streaming in `apps/hr-api/src/index.ts` under `POST /api/v1/import/employees`.
3. **Deploy to Cloudflare Staging**: Set the `AUTH_JWT_SECRET` secret first (`npx wrangler secret put AUTH_JWT_SECRET` in `apps/hr-api`), then run `npm run build` and `npx wrangler deploy` from `apps/hr-api` and `apps/hr-frontend`. Also set `FRONTEND_URL` (the frontend origin that sign-in links point at) and leave `MAGIC_LINK_DEV_LOG` unset, and apply `db/migrations/0001_employees_access_role.sql` to the target database (everyone starts as `employee`; promote people with SQL on `access_role`). Sending links needs a mail provider, which is not wired yet. To brand the sign-in background, put the client's images in `apps/hr-frontend/public/login-backgrounds/` and list them in `slides.json` (`{"intervalSeconds": 6, "slides": [{"src": "/login-backgrounds/hq.jpg", "alt": "Head office"}]}`; same-site paths or https URLs, up to 10 slides, 3 to 30 seconds each). With no slides listed, built-in gradients rotate instead. The frontend login screen (`/login`, `/login/verify`) is built and calls these routes; set `NEXT_PUBLIC_API_URL` to the deployed API and leave `NEXT_PUBLIC_DEMO_LOGIN` unset. Nobody can sign in on a deployed environment until the mail provider is wired.
