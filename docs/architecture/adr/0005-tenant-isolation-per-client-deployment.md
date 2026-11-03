# ADR-0005: Tenant isolation by deployment: one deployment per client, PostgreSQL in production

| | |
|---|---|
| Status | **Accepted** (for now; see revisit triggers) |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Deviates from | `BUILD.md` §11.1 and §12.2 (shared database with strict row-level scoping as the initial recommendation) |
| Relates to | `BASELINE_ASSESSMENT.md` §4 findings F-1 to F-5, risk R-1 |

## Context

`BUILD.md` recommends a shared PostgreSQL database with strict tenant scoping for SaaS. The baseline found that the inherited company scoping is a convenience filter: rows with no company are visible to every company, scoping is absent when no request context exists (scheduler, shell), and the default can be bypassed. Making that a hard boundary between customers would be substantial work with a high cost of error.

## Decision

1. **The isolation boundary between clients is the deployment.** Each client gets its own database, Redis, media or object storage, secrets, containers, hostname and backups. No two clients share a database or storage namespace.
2. **PostgreSQL is the production database.** SQLite is for single-user local development only. New models may rely on PostgreSQL constraints. Multi-process deployments assume PostgreSQL.
3. **Within a deployment**, several companies (for example the subsidiaries of one client) remain supported through the existing `Company` model and its permissions.
4. **Proposed addendum, needs confirmation:** new tenant-owned tables carry a required (non-null) company reference or a validated parent relationship, are scoped in the service layer, and never copy the "NULL means visible to all" behaviour (F-1). This keeps parity with Horilla's company model and preserves a path to a shared profile later.
5. The shared-database multi-tenant profile of `BUILD.md` §12.2 is **deferred, not abandoned**. Code must not hard-code single-company assumptions.

## Alternatives considered

- **Shared database, strict row-level scoping (BUILD default):** best cost per client, but needs the scoping weaknesses fixed first and carries leakage risk. Deferred.
- **Schema or database per tenant inside one application instance:** needs routing and migration tooling that does not exist here. Rejected for now.
- **PostgreSQL Row Level Security as defence in depth:** requires a full design for tenant context across requests, tasks and connection pooling (BUILD §11.1). Deferred.

## Consequences and risks

- The cross-client leakage class is removed from application code paths. F-1 to F-3 now matter only between companies inside one client and for superusers.
- Security tests re-scope to company boundaries, roles and object permissions inside a deployment.
- **Operational cost per client:** provisioning (database, Redis, secrets, domain and TLS, backups, monitoring, scheduler and worker). This needs a repeatable, scripted provisioning runbook.
- **Releases roll out to many deployments:** versioned artefacts, an automated deploy, a controlled migration step per deployment and visible version information (BUILD §12.5 and §12.6).
- Licence or entitlement is per deployment. No cross-client aggregation or benchmarking.
- Higher infrastructure cost for small clients.
- BUILD Phase 5 changes: the "cloud multi-tenant" test becomes a per-client deployment and provisioning test.

## Migration and compatibility

None. This is a deployment decision and changes no schema.

## Revisit when

The number of clients makes the operating cost unacceptable, or the product needs a shared SaaS offering.
