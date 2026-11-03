# ADR-0006: Deployment profiles: client premises first, Cloudflare for demos

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Relates to | `BUILD.md` §12.2, §12.3; ADR-0005; ADR-0007 |

## Context

ADR-0005 fixes one deployment per client on PostgreSQL. The owner's stated targets are: Cloudflare in front for **demonstrations**, and deployment on the **client's premises or the client's own servers** for real use.

## Decision

1. **Primary profile: customer-managed deployment** (on premises or on the client's servers) using the supported Docker Compose stack: reverse proxy and TLS, web (gunicorn), worker (ADR-0007), scheduler, PostgreSQL, Redis, persistent volumes, backup jobs, health and readiness checks. It must work with optional external services unavailable or disabled (BUILD §12.3).
2. **Demo profile: Cloudflare in front** of a ScoReview deployment (Cloudflare Tunnel for TLS and no open inbound ports). It is for demonstrations only and carries no client data.
3. The hosted multi-tenant cloud profile of `BUILD.md` §12.2 stays deferred (ADR-0005).
4. One codebase and one versioned artefact for all profiles. Differences are configuration only (BUILD §12.1).
5. Each deployment has its own hostname, secrets, database and backups.

## Alternatives considered

- **Cloudflare (or another cloud) as the production host for all clients:** conflicts with the stated on-premises preference and needs a hosted profile that is deferred. Rejected for now.
- **Separate code branches per profile:** violates BUILD §12.1. Rejected.

## Consequences and risks

- The on-premises guide, backup and restore runbook, and an upgrade procedure become first-class deliverables (BUILD Phase 5).
- **Behind Cloudflare Tunnel (demo) two known issues must be fixed first:** nginx overwrites `X-Forwarded-Proto` with its own scheme, so Django would treat requests as insecure; and the brute-force lockout identifies users by IP, so it needs the proxy count configured. Neither affects a direct on-premises setup with TLS at the customer's proxy.
- The web entrypoint runs `migrate` at start-up; for customer upgrades it must become an explicit step (BASELINE F-10).
- Client environments vary: restricted internet is expected, so the frontend must not depend on CDNs in production (BUILD §15.4).

## Migration and compatibility

None. Deployment configuration and documentation only.
