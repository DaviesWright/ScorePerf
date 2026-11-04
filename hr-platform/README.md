# HR Platform (Cloudflare SaaS Monorepo)

A Cloudflare-native enterprise HR & Performance platform built on Workers, Hono, Hyperdrive, Queues, Workflows, and OpenNext.

## Architecture

```mermaid
flowchart TD
    Client["Browser / Mobile Client"] -->|"HTTPS"| CF["Cloudflare Edge Network"]

    subgraph Apps["Applications (Cloudflare Workers)"]
        Frontend["apps/hr-frontend\nNext.js 15 (OpenNext)"]
        API["apps/hr-api\nHono REST API Worker"]
        Jobs["apps/hr-jobs\nQueue Consumer + Workflows"]
    end

    CF --> Frontend
    CF --> API

    subgraph Data_And_Infrastructure["Cloudflare Infrastructure & Managed Data"]
        Hyperdrive["Cloudflare Hyperdrive\n(Pooled TCP & Edge Query Cache)"]
        KV["Cloudflare KV\n(SESSIONS & Config)"]
        Queues["Cloudflare Queues\n(hr-jobs-queue)"]
        Workflows["Cloudflare Workflows\n(PerformanceReviewWorkflow)"]
        Postgres[("Managed PostgreSQL\n(Neon / Supabase / RDS)")]
    end

    Frontend -->|"REST"| API
    API --> Hyperdrive
    API --> KV
    API --> Queues
    API --> Workflows
    Hyperdrive --> Postgres

    Queues -->|"Consumer Trigger"| Jobs
    Jobs --> Hyperdrive
    Jobs --> Workflows
```

## Monorepo Layout

```
hr-platform/
├── package.json              # Monorepo workspace root
├── README.md                 # Architecture & getting started guide
├── tsconfig.json             # Root TypeScript config
├── docs/
│   └── MIGRATION.md          # NestJS → Hono pattern mapping guide
├── db/
│   └── schema.sql            # Full PostgreSQL schema (tables, foreign keys, indexes)
├── packages/
│   └── shared/               # Shared TypeScript types & Zod schemas
└── apps/
    ├── hr-api/               # Hono REST API Worker
    ├── hr-jobs/              # Cloudflare Queues consumer & Workflows orchestrator
    └── hr-frontend/          # Next.js frontend with OpenNext adapter
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Cloudflare Resources
Ensure your Cloudflare account has:
1. **Hyperdrive config:**
   ```bash
   npx wrangler hyperdrive create hr-db --connection-string="postgres://user:pass@host:5432/hr_platform"
   ```
2. **Queue:**
   ```bash
   npx wrangler queues create hr-jobs-queue
   ```
3. **KV Namespace:**
   ```bash
   npx wrangler kv namespace create SESSIONS
   ```

### 3. Local Development
```bash
npm run dev:api       # Runs Hono API at http://localhost:8787
npm run dev:jobs      # Runs Queue consumer worker
npm run dev:frontend  # Runs Next.js frontend at http://localhost:3000
```
