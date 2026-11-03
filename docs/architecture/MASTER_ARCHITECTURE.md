# ScoReview — Master Architecture

> System architecture, repository assessment, application boundaries, tenant isolation, deployment profiles, background processing, reliability and compatibility.

This is a companion document extracted from the comprehensive ScoReview `BUILD.md`. The master `BUILD.md` remains the controlling specification; where interpretation or cross-document dependencies arise, follow the master document and record material decisions as Architecture Decision Records.

## Source context

The ScoReview platform is being extended from its existing OKR capability to support MBO and Balanced Scorecard (BSC), with framework selection at performance-cycle level and one framework per cycle. The implementation must preserve existing OKR behaviour, reuse authoritative Horilla records, and support cloud SaaS and on-premises deployment.

## 1. Purpose and implementation mandate

This document defines the engineering instructions for extending
ScoReview from its current OKR-focused performance management capability
into a configurable, multi-framework performance management platform.

ScoReview must support organisations across industries and sizes, with
both cloud-hosted and customer-managed on-premises deployments. Each
organisation must be able to select the performance methodology used for
a performance cycle:

-   **OKR:** Objectives and Key Results.
-   **MBO:** Management by Objectives.
-   **BSC:** Balanced Scorecard.

The initial product rule is **one framework per performance cycle**.
Different organisations may use different frameworks, and one
organisation may use different frameworks in separate cycles. Do not
implement mixed-framework scoring inside one cycle in the initial
release. The architecture must not prevent a later, explicitly
configured multi-framework arrangement.

### 1.1 Non-negotiable engineering principles

1.  Preserve working OKR behaviour. Do not rewrite or replace it without
    evidence that a change is necessary.
2.  Inspect the repository and existing database before designing
    migrations or assuming model names.
3.  Reuse existing Horilla organisation, employee, department,
    authentication and permission entities where appropriate. Do not
    create parallel employee or company master records.
4.  Build a **modular Django monolith**, not a collection of
    microservices.
5.  Keep methodology-specific structures and rules in their own domain
    modules.
6.  Share genuinely common services: cycles, assignments, evidence,
    workflow, audit, notifications, reporting and access control.
7.  Make scoring deterministic, versioned, testable and explainable.
    Never allow AI to calculate or certify a final score outside
    approved deterministic rules.
8.  Treat company/tenant isolation as a security boundary, not merely a
    UI filter.
9.  Use one application codebase for cloud and on-premises deployments.
10. Deliver in small, reviewable increments with migrations, tests,
    documentation and rollback considerations.
11. Never silently change approved targets, weights, scoring rules or
    certified results.
12. Do not invent data, employee records, KPIs, targets, scores or
    evidence in production workflows or test fixtures presented as real
    data.

### 1.2 Product outcomes

The finished platform must enable an authorised organisation to:

-   Configure its company structure and performance settings.
-   Select OKR, MBO or BSC for a performance cycle.
-   Define and approve objectives, measures, targets and weightings
    appropriate to that framework.
-   Assign performance plans to business units, departments, teams and
    employees.
-   Monitor progress and record evidence.
-   Conduct employee and manager assessments.
-   Apply controlled scoring and calibration.
-   Approve, certify and publish results.
-   Produce employee, departmental and enterprise reports.
-   Create development actions from performance outcomes.
-   Operate securely in SaaS or on-premises environments.

------------------------------------------------------------------------


## 3. Required repository discovery and baseline assessment

**Do this before modifying application code or creating migrations.**

### 3.1 Repository inventory

Record:

-   Git branch, commit hash and working-tree status.
-   Python and Django versions.
-   Installed applications and middleware.
-   URL routing and API namespaces.
-   Existing model locations and migration state.
-   Templates, static assets and frontend build process.
-   Background scheduler and job configuration.
-   Authentication and permission backends.
-   Storage configuration.
-   Docker/Compose and deployment manifests.
-   CI workflows and current test commands.
-   Existing documentation and known technical debt.

Do not overwrite unrelated working-tree changes. Do not reset, clean,
rebase or force-push without explicit authorisation.

### 3.2 Existing OKR assessment

Map the current implementation:

  -----------------------------------------------------------------------
  Area                                Discovery questions
  ----------------------------------- -----------------------------------
  Models                              What are the actual Objective, Key
                                      Result, cycle and assignment
                                      models?

  Ownership                           Are objectives owned by employees,
                                      teams, departments or companies?

  Alignment                           How are parent/child objectives
                                      represented and validated?

  Progress                            How is progress calculated? Which
                                      result types exist?

  Check-ins                           Who can update them, and are
                                      changes audited?

  Scoring                             Is progress converted into a
                                      rating? Is the formula
                                      configurable?

  Workflow                            What approval and review stages
                                      exist?

  Permissions                         Are all reads and writes
                                      company-scoped and
                                      object-authorised?

  APIs                                Which endpoints are consumed by
                                      web/mobile clients?

  Reports                             Which outputs depend on current OKR
                                      model fields?

  Data                                How many records exist, and are
                                      there legacy/null/inconsistent
                                      values?
  -----------------------------------------------------------------------

Create an **OKR behaviour and compatibility matrix** listing current
behaviour, tests, dependencies and any proposed change. Preserve current
semantics unless a change is approved.

### 3.3 Existing Horilla integration assessment

Identify the authoritative models for:

-   Company/tenant.
-   Employee.
-   Department.
-   Job position/title.
-   Reporting manager/supervisor.
-   User and authentication.
-   Employee status/employment dates.
-   Organisation hierarchy.

Use existing foreign keys and established service patterns. Avoid
duplicating employee identity or company structure.

### 3.4 Baseline evidence

Before implementation, capture:

-   Test-suite result and known failures.
-   Migration status.
-   Static analysis result.
-   API schema snapshot if available.
-   Current OKR critical-path screenshots or acceptance evidence.
-   Existing deployment smoke-test result.

Classify pre-existing failures separately. Do not attribute them to the
new work, but do not conceal them.

**Deliverable:** `docs/architecture/BASELINE_ASSESSMENT.md`.

------------------------------------------------------------------------


## 4. Target application architecture

### 4.1 Architecture style

Use a modular Django monolith. Domain boundaries should be explicit
through models, services, selectors/query services, validators,
serializers, views and tests. Do not split into microservices merely to
create conceptual separation.

Suggested Django app boundaries (adapt names to existing conventions):

``` text
horilla/                         # Existing host application; preserve conventions
performance_core/                # Cycles, assignments, common objective references
performance_catalog/             # KPI/measure library and target definitions
okr/                              # Existing OKR domain; preserve and adapt carefully
mbo/                              # MBO domain
bsc/                              # Balanced Scorecard domain
performance_evaluation/           # Assessment, scoring adapters, certification
performance_workflow/            # Reusable approval workflow, if not already present
performance_evidence/            # Evidence metadata, access and retention
performance_analytics/            # Reports, aggregation and dashboards
performance_ai/                  # AI orchestration, governance and audit
performance_integrations/        # HRIS/mobile/external integration boundaries
```

These are logical boundaries, not a mandate to create empty apps. Reuse
existing apps where they already own the domain. Avoid circular imports.
Shared domain services must not import framework-specific models
unnecessarily.

### 4.2 Dependency direction

Preferred dependency direction:

``` text
Presentation (templates, views, API)
              |
              v
Application services / use cases
              |
       +------+------+
       |             |
       v             v
Common domain    Framework domains
(core, catalog)  (OKR / MBO / BSC)
       |             |
       +------+------+
              |
              v
Infrastructure adapters
(database, storage, email, queue, AI, audit)
```

Framework modules may depend on shared core contracts. Shared core must
not depend on MBO or BSC implementation details. Cross-framework
reporting should consume common result contracts or read models, not
reach into arbitrary framework tables from templates.

### 4.3 Layering rules

-   **Models:** persistence, basic invariants and relationships; avoid
    putting complex workflow orchestration in model save methods.
-   **Services/use cases:** business operations and transaction
    boundaries.
-   **Selectors/query services:** scoped reads and reusable query logic.
-   **Validators:** domain and cross-field validation.
-   **Scoring adapters:** pure deterministic calculations with explicit
    inputs and outputs.
-   **Views/API:** authentication, request validation, service
    invocation and response formatting.
-   **Tasks:** asynchronous orchestration; call the same services used
    by synchronous paths.
-   **Signals:** use sparingly; do not hide critical business operations
    in signals.
-   **Templates:** presentation only; never calculate authoritative
    scores in the browser.

Use `transaction.atomic()` for multi-record operations and lock rows
where concurrent approval or target changes could cause race conditions.

------------------------------------------------------------------------


## 11. Multi-tenancy and authorisation

Security is a release-blocking requirement.

### 11.1 Tenant isolation

-   Use the existing authoritative company/tenant model.
-   Scope all tenant-owned queries by the authenticated user's
    authorised company context.
-   Validate tenant consistency across every foreign-key relationship
    accepted from user input.
-   Never trust a tenant/company ID supplied by the client without
    checking authority.
-   Do not rely on hiding UI links as an access control.
-   Apply the same rules to HTML views, APIs, exports, background jobs,
    reports and document downloads.
-   Ensure scheduled tasks process only the intended tenant records.
-   Add database constraints where possible to prevent cross-tenant
    relationships.

For SaaS, a shared PostgreSQL database with strict tenant scoping is the
initial recommendation. Larger or regulated customers may be deployed in
isolated databases or dedicated environments.

PostgreSQL Row Level Security may be introduced as defence in depth only
after a complete design for setting and clearing tenant context across
requests, tasks, connection pooling and transactions. It must not
replace application-level authorisation.

### 11.2 Permission layers

Use the existing company-scoped permission backend and employee
permission conventions where appropriate. Add domain permissions for:

-   Configure framework.
-   Create/edit objectives.
-   Approve objectives.
-   Submit actuals/evidence.
-   Assess.
-   Review.
-   Calibrate.
-   Certify.
-   Publish.
-   View own/team/department/company results.
-   Export sensitive reports.
-   Administer AI settings.

Support role, company, department, reporting relationship, assignment
and object-level checks.

### 11.3 Required roles (configurable)

-   Platform Administrator.
-   Company Administrator.
-   HR Administrator.
-   Performance Manager.
-   Department Head.
-   Line Manager.
-   Employee.
-   Reviewer.
-   Calibration Committee Member.
-   Executive/Read-only Viewer.

Roles are starting templates, not hardcoded identities. Tenants may
configure role assignments within permitted boundaries.

### 11.4 Security tests

For every new endpoint and workflow action, test:

-   Same-tenant authorised user.
-   Same-tenant unauthorised user.
-   Different-tenant user.
-   Unauthenticated user.
-   User with stale or revoked access.
-   Employee attempting to access another employee's record.
-   Manager attempting access outside reporting/department scope.
-   Export and attachment access.
-   Background task tenant context.

------------------------------------------------------------------------


## 12. Cloud SaaS and on-premises deployment

### 12.1 Single codebase requirement

Maintain one application codebase and versioned deployment artefacts.
Use environment configuration and deployment profiles rather than
separate cloud/on-prem code branches.

### 12.2 Cloud profile

Expected components:

-   TLS-terminating load balancer/reverse proxy.
-   One or more Django/Gunicorn web instances.
-   PostgreSQL (managed or dedicated).
-   Redis (managed or dedicated).
-   Background workers.
-   Singleton scheduler/leader-elected scheduler.
-   Object storage (S3/GCS or compatible).
-   Centralised logs, metrics and error monitoring.
-   Backup and restore process.
-   Tenant provisioning and licence/entitlement management.

Start with a shared database and strict tenant isolation. Provide a path
to dedicated database or dedicated deployment for customers with
stronger isolation requirements.

### 12.3 On-premises profile

Provide a supported Docker Compose deployment for initial
customer-managed installations, with a documented path to orchestration
platforms where needed.

Expected components:

-   Nginx/reverse proxy and TLS.
-   Django/Gunicorn.
-   PostgreSQL.
-   Redis.
-   Worker process.
-   Scheduler process.
-   Local or customer-managed object storage.
-   Persistent volumes.
-   Backup jobs.
-   Health/readiness checks.
-   Offline or restricted-internet configuration.

Support optional LDAP/Active Directory, local SMTP or approved mail
relay, local storage and private AI provider configuration. The product
must remain usable when optional external services are unavailable or
disabled.

### 12.4 Environment configuration

Maintain a documented `.env.example` containing variable names and safe
placeholders only. Never commit secrets.

Configuration should cover:

-   `DEBUG`, `SECRET_KEY`, allowed hosts and trusted origins.
-   `DATABASE_URL`.
-   Redis/cache/broker settings.
-   Storage backend and credentials.
-   Email backend.
-   LDAP settings.
-   Sentry/observability.
-   AI provider and feature switches.
-   JWT lifetimes and security settings.
-   Tenant/deployment mode.
-   Licence configuration.
-   Scheduler/worker configuration.

Validate required production settings at startup. Fail safely with
actionable messages; do not silently fall back to insecure defaults.

### 12.5 Deployment reliability

-   Run containers as non-root.
-   Use pinned base images and dependency versions.
-   Use multi-stage builds.
-   Separate web, worker and scheduler processes.
-   Ensure only one scheduler leader runs a given schedule.
-   Use PostgreSQL for any multi-process deployment.
-   Use Redis for shared sessions/cache when multiple web workers or
    instances run.
-   Provide `/health/`, `/ready/` and `/metrics/` with appropriate
    access controls.
-   Health checks must distinguish process liveness from dependency
    readiness.
-   Use graceful Gunicorn shutdown and worker timeouts.
-   Define static/media handling explicitly.
-   Persist database and uploaded-file volumes.
-   Document restore testing, not just backup creation.

### 12.6 Migrations and release procedure

-   Run migrations as a controlled deployment step, not independently in
    every web container at startup.
-   Back up before production migrations.
-   Use expand-and-contract migrations for changes requiring
    compatibility across running versions.
-   Test migration from the current production schema and representative
    data.
-   Provide rollback or forward-fix instructions.
-   Do not assume every data migration is reversible; document
    irreversible operations.
-   Keep application and database migration versions visible in
    deployment diagnostics.

------------------------------------------------------------------------


## 13. Background processing and scheduling

The current stack uses APScheduler with django-apscheduler. Retain it
for scheduled triggers where suitable, but do not use it as the sole
engine for large or long-running asynchronous work.

### 13.1 Scheduler responsibilities

-   Cycle reminders.
-   Due-date reminders.
-   Scheduled cycle state checks.
-   Recurring report triggers.
-   Housekeeping and retention jobs.
-   Periodic integration polling where required.

### 13.2 Task queue recommendation

Introduce Celery with Redis (or an equivalent supported task queue
selected by engineering) for:

-   Bulk imports and exports.
-   PDF generation.
-   Large report generation.
-   Evidence processing.
-   AI jobs.
-   Bulk notifications.
-   Large scorecard recalculation.
-   Integration synchronisation.

### 13.3 Job requirements

Every asynchronous job must:

-   Be idempotent where feasible.
-   Carry an explicit tenant context.
-   Record job type, reference, status and timestamps.
-   Have bounded retries and backoff.
-   Handle permanent failure and dead-letter/reconciliation.
-   Avoid logging sensitive document contents or personal data.
-   Be observable and support safe reprocessing.
-   Avoid duplicate notifications or duplicate approvals.

Do not execute long-running work in HTTP request/response handlers.

------------------------------------------------------------------------


## 21. Performance, scale and reliability

Test realistic volumes, not only small developer fixtures.

At minimum, define test profiles for:

-   Small organisation.
-   Mid-sized organisation.
-   Large enterprise.
-   High-volume cycle opening/submission.
-   Concurrent manager and employee activity.
-   Large imports and exports.
-   Large BSC scorecard rollups.

Measure:

-   API latency.
-   Dashboard query latency.
-   Database query count and N+1 behaviour.
-   Worker queue delay.
-   Report generation time.
-   Memory/CPU use.
-   Scheduler delay.
-   Database connection usage.

Use indexes and query optimisation based on observed query plans. Cache
only data whose invalidation and tenant boundaries are understood. Never
cache confidential results under keys that omit tenant/user/permission
context.

Define operational targets with product and infrastructure owners before
production launch. Do not invent service-level guarantees in code or
marketing material.

------------------------------------------------------------------------


## 22. Data migration and compatibility

### 22.1 Migration principles

-   Inspect current schema and data before migration.
-   Never assume a clean database.
-   Use additive migrations first.
-   Backfill in bounded batches.
-   Make data migrations idempotent where feasible.
-   Avoid long table locks.
-   Test on a production-like copy with sensitive data appropriately
    protected.
-   Record row counts and validation results.
-   Preserve existing OKR identifiers and relationships.
-   Do not fabricate missing values during migration.
-   Provide rollback/forward-fix instructions.

### 22.2 Existing OKR data

Do not migrate OKR records into MBO or BSC tables merely to achieve a
common appearance. Existing OKR records should remain in the OKR domain
and be exposed through common reporting/result contracts where
appropriate.

If common objective references are introduced, create a controlled
mapping that preserves the original record and identity.

### 22.3 Migration acceptance

-   Existing records remain accessible.
-   Foreign keys remain valid.
-   Tenant ownership is intact.
-   Counts reconcile before and after.
-   Existing API responses remain compatible or are versioned.
-   Rollback/restore procedure is tested.
-   No default score, target or rating is invented for legacy records.

------------------------------------------------------------------------
