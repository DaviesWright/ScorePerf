# ADR-0015: Cloudflare SaaS Edge Architecture (Hono, Hyperdrive, Queues, Workflows, Upstash)

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Supersedes | ADR-0006 (Customer on-premise container profile); ADR-0007 (Celery + Redis worker process) |
| Relates to | `BUILD.md` §12, §13; ADR-0001, ADR-0005, ADR-0011, ADR-0012, ADR-0014 |

## Context

On 2026-11-03, the owner (**paa.barnes**) made the strategic decision to target **Cloudflare SaaS** as the production hosting platform for ScoReview Performance.

Previously, ADR-0006 prioritized customer-managed on-premises Docker containers, and ADR-0007 specified an asynchronous worker daemon running Celery and Redis. While suitable for traditional bare-metal client environments, this operational model imposes heavy maintenance overhead: persistent container daemons, Redis persistence administration, multi-process management, idle compute costs, and higher API latency.

Because the project is at the very beginning of Phase 1 with clean domain boundaries, pivoting now to a modern, serverless, edge-native architecture delivers 0ms cold starts, global edge performance, zero daemon maintenance, and elastic scalability.

## Decision

1. **API Framework:** Adopt **Hono** (`hono/cloudflare-workers`) on Cloudflare Workers in TypeScript. Hono is lightweight, web-standards-compliant, isolate-native, and features first-class TypeScript inference with zero cold starts.
2. **Database & Connection Acceleration:** Use **External Managed PostgreSQL** (e.g. Neon, Supabase, AWS RDS, or Tembo) connected via **Cloudflare Hyperdrive**. Hyperdrive maintains pooled TCP connections close to the database and automatically caches repeated SQL queries at edge locations.
3. **ORM & Schema:** Use **Drizzle ORM** (`drizzle-orm/postgres-js`). Drizzle is lightweight, type-safe, compiles directly to SQL, and is fully compatible with Cloudflare Workers' V8 isolates.
4. **Long-Running Lifecycle Orchestration:** Replace cron and DB-polling state transitions with **Cloudflare Workflows**. Performance cycle lifecycles (e.g. 90-day cycles, submission deadlines, manager review periods, calibration reminders) will be managed as durable, multi-step workflows that can sleep for days/weeks without consuming compute.
5. **Asynchronous Task Queue:** Replace Celery/Redis with **Cloudflare Queues** for asynchronous jobs (progress recalculations, audit event ingestion, batch notification dispatch) with built-in retries, dead-letter queues, and concurrency control.
6. **Caching & Ephemeral State:**
   - **Upstash Redis (REST):** Used over HTTP for distributed rate limiting (`@upstash/ratelimit`) and token revocation, eliminating TCP socket exhaustion on Workers.
   - **Cloudflare KV:** Zero-latency edge cache for static tenant configurations, framework settings, and white-label branding metadata.
   - **Cloudflare Durable Objects:** Stateful edge actors with WebSockets to power real-time collaborative calibration session rooms.
7. **Multi-Tenancy:** Maintain ADR-0005's tenant boundary principles. Edge middleware resolves the tenant context (via hostname, subdomain, or authenticated JWT claims), enforcing strict `company_id` isolation across all Drizzle queries.

## Alternatives Considered

| Option | For | Against | Decision |
|---|---|---|---|
| **Hono + Cloudflare Edge Stack (Chosen)** | 0ms cold start, global <15ms latency, durable Workflows, serverless Queues, Hyperdrive connection pooling, zero daemon management | Requires TypeScript codebase; proprietary Cloudflare cloud primitives | **Accepted** (matches stated Cloudflare SaaS target) |
| **Keep Django Monolith on Containers** | Keeps existing Python code; Django Admin | Heavy containers to patch; cold starts; requires maintaining Celery, Redis, and PgBouncer daemons | **Rejected** (heavy operational toil for SaaS) |
| **NestJS on Cloudflare Workers** | Existing Node/TypeScript enterprise patterns | Heavy bundle size; relies on Node.js reflection and globals; poor fit for lightweight V8 isolates | **Rejected** (inferior DX and bundle footprint compared to Hono) |
| **AWS Serverless (Lambda + SQS + Step Functions)** | Mature enterprise ecosystem | Higher latency than edge network; complex IAM; VPC cold start latencies; higher cost | **Rejected** (Cloudflare edge stack is simpler and faster) |

## Consequences and Risks

- **Language and Runtime Transition:** All backend domain logic (including the Phase 1 `scoreview_core` models, lifecycle state machine, and OKR endpoints) will be implemented in TypeScript under Hono and Drizzle rather than Python/Django.
- **Porting Phase 1 Domain Work:** The domain rules implemented in Python (the 10-stage lifecycle, OKR link validation, and company boundary checks) must be ported to Drizzle schemas and Hono services. Because this logic was specified and verified in tests today, porting it to TypeScript is straightforward.
- **Test Suite Strategy:** Unit tests will run via **Vitest** with `@cloudflare/vitest-pool-workers` (Miniflare 3), allowing tests to execute against actual Cloudflare Workers isolate bindings (Workflows, Queues, KV, Hyperdrive) locally and in CI.
- **Vendor Lock-in:** Cloudflare Workflows and Queues are proprietary to Cloudflare. However, Hono and Drizzle are open standards, and the underlying PostgreSQL database remains standard external Postgres.

## Migration and Compatibility

1. Scaffold Cloudflare Workers project (`scoreview-edge` or `apps/api`) with `wrangler.jsonc`.
2. Define Drizzle PostgreSQL schema for core identity (`companies`, `users`, `employees`) and performance core (`framework_types`, `framework_configurations`, `performance_cycles`, `performance_assignments`, `okr_cycle_links`).
3. Migrate existing OKR tables (`objectives`, `key_results`, `employee_objectives`, `employee_key_results`, `comments`).
4. Port existing test contracts to Vitest.

