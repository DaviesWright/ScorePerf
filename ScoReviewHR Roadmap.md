# ScoReviewHR Product Roadmap & Transition Document

| Metadata | Details |
|---|---|
| **Product** | ScoReview Enterprise HRMS & Performance Platform (ScoReviewHR) |
| **Date** | 2026-11-03 |
| **Document Version** | 3.1 (claims corrected against the code, 2026-11-21) |
| **Author / Handover Lead** | Principal Systems Architect & Product Engineering Lead (AI Agent Pair with `paa.barnes`) |
| **Current Repository Target** | `hr-platform/` (Cloudflare SaaS Edge Monorepo) & Neon Lakebase PostgreSQL (`aws-eu-west-2`) |
| **Primary Production Tenant** | Senrab ConsulTech (`senrab.com`, Tenant ID: `1`, 45 active workforce members, 54 tracked assets) |

---

## 1. Objective and Scope

### 1.1 The Push-Based Paradigm Shift (ADR-0018)
Traditional enterprise HR tools are **pull-based** and administrative-friction-heavy: employees must hunt through nested menus, remember review deadlines, and manually assemble data.

**ScoReviewHR is push-based.** By combining **agentic AI**, **contextual UX (`Cmd+K`)**, and a **skills-first architecture**, the platform actively works for the employee:
* **Proactive Intelligence:** Detects upcoming bank holidays, analyzes unused PTO balances, and pre-drafts leave requests with zero team sprint collisions.
* **Contextual Speed (`Cmd+K`):** Eliminates 4-level deep menus. Typing `"Payslip"` opens a sample payslip (design prototype; payroll is suppressed).
* **Skills-First Architecture:** Replaces static job descriptions with dynamic competency graphs, matching staff to internal stretch gigs and auto-compiling weekly wins into bias-free performance reviews.

### 1.2 Security & Compliance (ADR-0017): current state, not certified
* **Certification:** ScoReviewHR is **not** SOC 2 or ISO/IEC 27001 certified, and no audit has started. ISO/IEC 27001:2022 readiness is the first target. Registration with Ghana's Data Protection Commission (Data Protection Act, 2012, Act 843) comes before any external certification.
* **In place today:** signed-token authentication on every `/api/v1` route, with tenant, user and role taken from the token (client headers ignored); payroll routes return `403` for employees and line managers; database triggers lock approved objectives and a cycle's framework; per-domain change history for assets, objectives, goals and the organogram.
* **Not yet built:** document encryption beyond the hosting providers' default encryption at rest; per-document integrity digests; a durable, tenant-scoped, tamper-evident audit ledger (`/api/v1/compliance/audit-trail` is an in-memory demo); a documented basis for holding Ghanaian employee data in AWS London (`eu-west-2`).

---

## 2. Status vs. Plan (Verified Against Actual Outputs)

| Functional Area | Planned Deliverable | Actual Output Status | Evidence / Verification |
|---|---|---|---|
| **Database Architecture** | Relational schema covering all HCM domains | **LIVE** | `hr-platform/db/schema.sql` (54 tables) plus 33 migrations in `db/migrations/`, applied to Neon PostgreSQL. |
| **Edge API Gateway** | Hono REST API (`apps/hr-api`) on Cloudflare Workers | **LIVE** | `apps/hr-api`; 176 API tests pass (21 Nov 2026). |
| **Multi-Tenancy & RBAC** | Strict tenant isolation & payroll restriction | **DONE (API)** | Tenant, user and role come from a signed token; `X-Company-ID` and other client headers are ignored. Payroll routes return `403` (`RBAC_PAYROLL_ACCESS_DENIED`) for line managers and employees. |
| **Data Privacy & Certification** | SOC 2 Type II, ISO 27001, document encryption | **NOT STARTED** | No audit engaged, no certificate held, no document encryption beyond hosting-provider defaults. `GET /api/v1/compliance/privacy-status` reports this. |
| **Audit Trail** | Tamper-evident record of human and AI changes | **PARTIAL** | Per-domain history tables are live (`asset_audit_events`, `performance_audit_events`, `objective_amendments`). The central `/api/v1/compliance/audit-trail` endpoint is an in-memory demo, not hash-chained, and must not be shown as evidence. |
| **Proactive Push Feed** | Automated PTO drafting, gig matching & win synthesis | **PROTOTYPE** | UI with sample data in `EmployeeSelfServiceView.tsx`; no AI behind it. The working AI feature is the "Dede" chat assistant (`app/api/dede/route.ts`). |
| **Design Language** | "Linear meets Notion" (Deep Indigo, Emerald, Soft Peach) | **DONE** | Tokens in `tokens.ts`; Inter loaded in `layout.tsx` (Geist fonts not yet loaded). |
| **Collapsible Navigation** | Left-hand sidebar with `⌘[` toggle & floating tooltips | **COMPLETE (100%)** | Verified in `AppSidebar.tsx` (smooth 240px $\leftrightarrow$ 68px rail transition with shortcut `⌘[`). |
| **Instant Payslip (`Cmd+K`)** | Zero-menu payslip inspection via command palette | **PROTOTYPE** | `PayslipModal.tsx` opens with static sample Ghana figures; payroll is suppressed. Not a statutory record. |
| **Framework Governance** | OKR / MBO / BSC single selection & anti-mixing (ADR-0016) | **PARTIAL** | Lock is done: trigger `trg_cycle_framework_immutable`, API rejects mixed payloads (`422`) and changes (`400`). OKR scoring done. MBO and BSC use the shared scoring engine; BSC perspective weights and MBO missing-objective rules wait on decisions (Handover open questions 1 and 2). |
| **Workforce Seeding** | Senrab ConsulTech demo workforce | **DONE** | 45 fictional employees with `@senrab.com` emails across 7 departments. |
| **Asset Allocation** | Demo hardware assets | **DONE (database only)** | 54 assets in the Neon database; no seed file in the repo. |
| **Module Suppression** | Suppress Recruitment, Onboarding, Offboarding, Payroll | **COMPLETE (100%)** | Omitted from active matrix; API returns `{ suppressed: true }`. Database tables preserved 100%. |

---

## 3. Decisions Made & Rationale

| # | Decision | Decision Maker & Date | Options Considered & Rejected | Rationale |
|---|---|---|---|---|
| **D-01** | **Cloudflare SaaS Edge Monorepo Architecture (ADR-0015)** | `paa.barnes`<br>2026-11-03 | • Django + Celery + Redis container daemons.<br>• AWS Lambda + Step Functions.<br>• NestJS on Workers. | Eliminates server/container patch toil; durable state machine workflows; no idle compute cost. Latency not yet measured (the database is in London). |
| **D-02** | **Single Framework Purity per Appraisal (ADR-0016)** | `paa.barnes`<br>2026-11-03 | • Allow hybrid OKR+BSC scorecards in one cycle.<br>• Allow switching frameworks mid-cycle. | Mixed scoring corrupts mathematical weighting, invalidates calibration distributions, and generates conflicting feedback. Single framework lock guarantees rigor. |
| **D-03** | **RBAC Zero-Leak Payroll; SOC 2 / ISO 27001 as future targets (ADR-0017)** | `paa.barnes`<br>2026-11-03 | • Permissive role model.<br>• Client-side only hiding of payroll cards. | Executive compensation and payroll must never leak. Strict edge gateway 403 enforcement prevents data breaches. |
| **D-04** | **Push-Based Agentic Workforce Architecture (ADR-0018)** | `paa.barnes`<br>2026-11-03 | • Traditional pull-based navigation.<br>• Passive LLM chatbot widgets. | Shifting cognitive load from the employee to the system saves hours of administrative overhead and eliminates annual review dread. |
| **D-05** | **"Linear meets Notion" Design System** | `paa.barnes`<br>2026-11-03 | • Generic Bootstrap / Tailwind templates.<br>• Heavy enterprise ERP styling (SAP/Workday). | Modern, minimal, high-contrast aesthetic creates a consumer-grade experience that staff love using daily. |
| **D-06** | **Freeze the legacy Django/Horilla stack; remove by 2026-11-30** | `paa.barnes`<br>2026-11-21 | • Keep both stacks live.<br>• Reverse ADR-0015. | One product to build, test and sell. Django is read-only reference until removal; features are ported by behaviour, not code (Horilla is LGPL-2.1). |

---

## 4. Key Architectural Decision Records (ADRs)

1. [**ADR 0015: Cloudflare SaaS Edge Monorepo Architecture**](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/docs/architecture/adr/0015-cloudflare-saas-edge-architecture.md)
2. [**ADR 0016: Single-Framework Appraisal Purity & Anti-Mixing Governance**](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/docs/architecture/adr/0016-single-framework-appraisal-purity.md)
3. [**ADR 0017: SOC2 Type II, ISO 27001, RBAC Enforcement & Immutable Audit Trails**](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/docs/architecture/adr/0017-soc2-iso27001-rbac-immutable-audit.md)
4. [**ADR 0018: Push-Based Agentic Workforce Architecture (Zero-UI, Contextual Cmd+K, Skills-First)**](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/docs/architecture/adr/0018-push-based-agentic-workforce-architecture.md)

---

## 5. Verification Checklist (re-run 2026-11-21)

* [x] **Edge REST API tests:** 176 of 176 pass.
* [ ] **TypeScript Typecheck:** 116 errors after the TypeScript 7 upgrade.
* [ ] **Clean install:** `npm ci` fails (lockfile mismatch; zod 4 vs `@hono/zod-validator` 0.4.3 peer conflict). Install works with `--legacy-peer-deps`.
* [ ] **Next.js Production Build:** not re-verified; blocked by the type errors.
* [ ] **CI:** no workflow runs against `hr-platform/`.
* [x] **Command Palette:** `Cmd+K` + `"Payslip"` + `Enter` opens the sample payslip modal.
