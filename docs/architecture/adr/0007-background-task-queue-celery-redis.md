# ADR-0007: Background task queue: Celery with Redis

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Relates to | `BUILD.md` §13; `BASELINE_ASSESSMENT.md` R-5 |

## Context

Today the only background engine is APScheduler (`django-apscheduler`), in one dedicated scheduler process. It is a scheduler, not a work queue. `BUILD.md` §13 requires long work (PDF generation, large reports, imports and exports, evidence processing, bulk notifications, large recalculation, AI jobs) to run outside HTTP requests with retries, tenant context and observability. Redis is already part of the production stack for cache and sessions. With one deployment per client (ADR-0005), each deployment runs its own worker.

## Decision

1. Introduce **Celery with Redis as the broker** for asynchronous work.
2. **Keep APScheduler** for time-based triggers, one scheduler process per deployment. Scheduled triggers enqueue Celery tasks instead of doing heavy work inline. Celery beat is not added, so there is only one scheduler.
3. Every task meets `BUILD.md` §13.3: idempotent where feasible, explicit company context passed as an argument, recorded job type, reference, status and timestamps, bounded retries with backoff, safe reprocessing.
4. Redis persistence (append-only file) is required in every deployment profile so queued work survives a restart.

## Alternatives considered

| Option | For | Against |
|---|---|---|
| **Celery + Redis (chosen)** | Most mature; retries, rate limits, chaining, wide ecosystem; Redis already required | Heavier configuration; Redis broker is less durable than a dedicated broker unless persistence and idempotency are handled |
| **Procrastinate** (PostgreSQL-backed) | No separate broker; transactional enqueue with the database; fewer moving parts for on-premises | Smaller ecosystem and community; fewer features |
| **RQ** (Redis Queue) | Simple, small | Fewer features (retries and scheduling are basic); less suited to complex workflows |
| **Dramatiq** | Clean design, good defaults | Smaller ecosystem than Celery |
| **Huey** | Lightweight, Redis or SQLite | Limited scale and ecosystem |
| **django-q2** | Django-native, database or Redis | Smaller community; less proven at scale |
| **Keep APScheduler only** | No new component | Not a queue: no durable work items, weak retry and visibility; unsuitable for heavy jobs |
| **Django's built-in tasks API** | Standard interface | Still needs a worker backend; the project is on Django 5.2 |

Reason for the choice: Celery adds no new infrastructure because Redis is already required, and it has the strongest feature set for the retry, status and bounded-failure requirements in `BUILD.md`.

## Consequences and risks

- A new **worker** process in the Compose stack (web, worker, scheduler, database, Redis, nginx), and new dependencies.
- Tasks do not inherit request context. The company context must be passed explicitly (baseline finding F-2).
- Queued work can be lost if Redis is not persistent. Enforce AOF, use late acknowledgement together with idempotent tasks, and monitor queue depth.
- Tests run tasks eagerly; add integration tests for retry and failure paths.
- On-premises documentation must cover the worker.

## Migration and compatibility

Additive. No schema change. Existing APScheduler jobs keep running until individually moved.

## Revisit when

Operating a Redis-backed queue proves too heavy for on-premises customers; Procrastinate is the fallback because it needs only PostgreSQL.
