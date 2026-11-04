# ScoReview --- BUILD.md

## Comprehensive Developer Build Specification

**Document status:** Accepted implementation baseline (Updated per ADR-0015)\
**Product:** ScoReview Performance Management Platform\
**Architecture:** Cloudflare SaaS Edge Monorepo (`hr-platform`: Next.js 15 App Router, Hono REST API Worker, Cloudflare Queues/Workflows/KV, Hyperdrive) backed by Serverless PostgreSQL (Neon), with Python/Django core as domain reference engine\
**Frameworks:** OKR, MBO and Balanced Scorecard (BSC)\
**Primary audience:** Engineering, product, QA, DevOps, security and
implementation teams

------------------------------------------------------------------------

## 1. Purpose and implementation mandate

This document defines the engineering instructions for extending
ScoReview from its initial OKR-focused performance management capability
into a configurable, multi-framework performance management platform.

ScoReview supports organisations across industries and sizes via a globally
distributed Cloudflare SaaS Edge architecture, with portable PostgreSQL schema
for customer-managed or hybrid scenarios. Each organisation selects the
performance methodology used for a performance cycle:

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
3.  Maintain unified company, employee, department, authentication and
    permission entities across all frameworks. Do not create parallel
    employee or company master records.
4.  Build a **Cloudflare SaaS Edge Monorepo (`hr-platform`)** leveraging
    serverless edge primitives (Workers, Hyperdrive, Queues, Workflows, KV)
    backed by Neon PostgreSQL, maintaining strict domain boundaries.
5.  Keep methodology-specific structures and rules in their own domain
    modules (`packages/shared`, `db/schema.sql`, framework engines).
6.  Share genuinely common services: cycles, assignments, evidence,
    workflow, audit, notifications, reporting and access control.
7.  Make scoring deterministic, versioned, testable and explainable.
    Never allow AI to calculate or certify a final score outside
    approved deterministic rules.
8.  Treat company/tenant isolation as a security boundary (tenant and role
    taken from a verified bearer token, never from client headers, plus
    PostgreSQL relational scoping), not merely a UI filter.
9.  Use a single edge monorepo (`hr-platform`) with portable PostgreSQL schema
    (`db/schema.sql`) for Cloudflare SaaS edge delivery and portable deployment.
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

## 2. Product scope and framework boundaries

### 2.1 Framework selection

Framework selection is made at the performance-cycle level. The selected
framework and its version/configuration must be snapshotted or
referenced immutably once the cycle enters an approved/active state.

Initial rule:

-   A cycle has exactly one selected framework.
-   A cycle cannot change framework after objectives or assignments have
    been approved, except through a controlled cancellation/recreation
    process or a formally approved migration workflow.
-   An organisation may run an OKR cycle and a separate MBO or BSC
    cycle, subject to configuration and access rules.
-   Framework configuration is tenant-specific.
-   Framework-specific scoring rules must not leak into another
    framework.

### 2.2 OKR

Retain and stabilise the existing OKR module. Expected concepts include:

-   Objective.
-   Key Result.
-   Alignment/cascade relationship.
-   Check-in/progress update.
-   Confidence/status.
-   Period and owner.
-   Evidence.
-   Dependencies, where currently supported or approved for addition.

Do not assume that OKR progress is equivalent to an employee's
performance rating. OKR achievement is an input to performance
conversations where the organisation chooses to use it; it is not
automatically the overall appraisal score.

### 2.3 MBO

MBO is based on agreed objectives and measurable or assessable outcomes.

Required capabilities:

-   Objective creation and categorisation.
-   Expected outcome/deliverable.
-   Measurement definition.
-   Target and unit.
-   Direction of measurement: higher-is-better, lower-is-better,
    exact/within-range, milestone, qualitative or binary.
-   Weight.
-   Employee-manager agreement.
-   Approval and locking of agreed targets.
-   Actual result recording.
-   Evidence attachment.
-   Employee self-assessment.
-   Supervisor assessment.
-   Configurable review and approval workflow.
-   MBO-specific scoring and reporting.

### 2.4 Balanced Scorecard

BSC is an organisational strategy execution methodology. The system must
support the standard four perspectives:

1.  Financial.
2.  Customer.
3.  Internal Business Processes.
4.  Learning and Growth.

Required capabilities:

-   Strategic themes.
-   Strategic objectives.
-   Strategy maps.
-   Cause-and-effect links between objectives.
-   Scorecards.
-   Perspective weighting.
-   Measures/KPIs linked to objectives.
-   Targets and actuals.
-   Strategic initiatives.
-   Scorecard assignment to organisational units and employees.
-   Cascading/alignment with explicit approval.
-   Leading/lagging indicator classification.
-   Perspective, objective, KPI, department and enterprise reporting.

Do not require every employee scorecard to contain all four
perspectives. Scorecards should include relevant measures that
contribute to organisational strategy. The four perspectives are the BSC
organising framework, not a requirement for identical employee-level
composition.

### 2.5 Enterprise HRMS Suite Module Map

Beyond the Performance Management System (PMS), ScoReview encompasses a complete
suite of 13 Core HRMS functional modules:

1.  **👥 Employee Management:** Centralized workforce data with LDAP/Active Directory
    integration, organization hierarchy, departments, job positions, and work profiles.
2.  **🎯 Recruitment:** End-to-end talent acquisition pipeline from job postings,
    requisitions, applicant tracking (ATS), interview scheduling, and scoring stages to offer letters.
3.  **📋 Onboarding & Offboarding:** Structured workflows for the entire employee
    lifecycle, including orientation checklists, asset handover, exit interviews, and clearances.
4.  **⏰ Attendance & Time Tracking:** Biometric device synchronization, automated check-in/out,
    geofencing validation, shift rotations, break tracking, and overtime calculation.
5.  **🏖️ Leave Management:** Multi-tier leave policies, balance tracking, accruals,
    carry-forward rules, company holiday calendars, and multi-level approval workflows.
6.  **💰 Payroll:** Automated salary structures, wage computation, tax deductions,
    allowances, contract agreements, pay periods, and digital payslip delivery.
7.  **📊 Performance Management (PMS):** Multi-framework evaluation (OKR, MBO, BSC),
    10-stage review lifecycle, continuous check-ins, calibration grids, and deterministic scoring.
8.  **🏢 Asset Management:** Tracking and custody management of company hardware,
    equipment, software licenses, serial numbers, allocation history, and returns.
9.  **🎫 Helpdesk:** Centralized internal HR and IT support ticketing system with SLA
    tracking, categorization, priority escalation, and resolution audit trails.
10. **🗂️ Project Management:** Project workspaces, task assignment, employee timesheets,
    milestone tracking, and billable hour calculations.
11. **📄 Documents:** Employee document requests, contracts, identity verifications,
    expiration alerts, and secure digital signature/approvals.
12. **📈 Dashboards & Reports:** Real-time role-based executive dashboards, workforce
    analytics, and automated scheduled reporting with email distribution.
13. **📥 Master Data Import:** High-volume spreadsheet/CSV ingest pipelines for bulk onboarding
    of employees, leave balances, assets, historical records, and salary structures.

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

### 4.1 Architecture style (Cloudflare SaaS Edge Monorepo)

Per **ADR-0015**, ScoReview is implemented as a **Cloudflare SaaS Edge Monorepo**
(`hr-platform/`), providing global edge delivery, sub-50ms regional latency,
and serverless scaling backed by Lakebase PostgreSQL (Neon) via Cloudflare Hyperdrive.
Domain boundaries are strictly maintained across workspaces:

``` text
hr-platform/
├── packages/
│   └── shared/                  # Common TypeScript domain types, schemas, Zod validation
├── apps/
│   ├── hr-api/                  # Hono REST API Worker (Workers, KV Sessions, Hyperdrive)
│   ├── hr-jobs/                 # Cloudflare Queues consumer (hr-jobs-queue, DLQ) & Workflows
│   └── hr-frontend/             # Next.js 15 App Router (OpenNext on Cloudflare Workers)
├── db/
│   └── schema.sql               # Authoritative PostgreSQL DDL (14 relational tables)
└── docs/
    └── MIGRATION.md             # NestJS/Django to Hono migration reference

scoreview_core/                  # Reference domain engine (10-stage lifecycle, deterministic scoring)
```

Workspace responsibilities:
- `packages/shared`: Canonical TypeScript types (`PerformanceCycle`, `KPI`, `Employee`, `TenantContext`) and Zod schemas replacing legacy DTOs/serializers.
- `apps/hr-api`: High-performance Hono REST API running on Cloudflare Workers edge nodes. Authenticates every `/api/v1/*` call with a signed bearer token and derives the tenant from its claims, manages session tokens in Cloudflare KV, routes database reads/writes through Hyperdrive connection pooling, and dispatches async tasks to Cloudflare Queues.
- `apps/hr-jobs`: Background execution engine consuming `hr-jobs-queue` with dead-letter queue fallback (`hr-jobs-dlq`), batch scheduling, and multi-stage lifecycle orchestration via Cloudflare Workflows (`PerformanceReviewWorkflow`).
- `apps/hr-frontend`: Next.js 15 App Router with React 19, compiled for Cloudflare edge execution via `@opennextjs/cloudflare`.
- `db/schema.sql`: Pure ANSI PostgreSQL DDL deployed to Neon Serverless Postgres (`aws-eu-west-2`), portable to any PostgreSQL 15+ engine.

### 4.2 Dependency direction

Preferred dependency direction:

``` text
Edge Presentation (Next.js 15 App Router / OpenNext)
              |
              v
Edge REST API (Hono Worker / apps/hr-api)
              |
       +------+------+
       |             |
       v             v
Shared Domain     Async Workflows & Queues
(packages/shared) (apps/hr-jobs / Workflows)
       |             |
       +------+------+
              |
              v
Infrastructure Adapters
(Cloudflare Hyperdrive -> Neon PostgreSQL, Cloudflare KV, Queues)
```

Framework modules depend on shared domain contracts. The edge API does
not directly couple to framework-specific scoring algorithms without type-safe
contracts. Asynchronous jobs consume standardized payloads from `hr-jobs-queue`.

### 4.3 Layering rules

-   **Database DDL (`db/schema.sql`):** Pure PostgreSQL schema with foreign keys,
    unique constraints, enums (`framework_code`, `cycle_status`), and indexes.
-   **Validation (`packages/shared/src/schemas.ts`):** Zod schemas runtime-validating
    payloads at the edge before hitting business logic or database queries.
-   **API Handlers (`apps/hr-api/src/index.ts`):** Fast, stateless Hono endpoints
    handling authentication, tenant scoping, and parameter extraction.
-   **Connection Pooling (Cloudflare Hyperdrive):** Edge connection pooling to
    Neon PostgreSQL, eliminating connection overhead and query latency across regions.
-   **Async Tasks (`apps/hr-jobs/src/index.ts`):** Durable background processing
    via Cloudflare Queues with automatic exponential backoff and DLQ capture.
-   **Workflows (`PerformanceReviewWorkflow`):** Durable Cloudflare Workflows with
    deterministic step execution, automated retries, and persistence across pauses.
-   **State & Caching (Cloudflare KV):** Low-latency session management and ephemeral
    tenant metadata storage (`SESSIONS` namespace).
-   **Presentation (`apps/hr-frontend`):** Server-rendered React components fetching
    from edge APIs with zero secret leakage to the client.

------------------------------------------------------------------------

## 5. Common domain model and data design

The following is a logical model. Developers must reconcile it with
existing models before implementation. Reuse or extend existing entities
where possible.

### 5.1 Core entities

  --------------------------------------------------------------------------
  Entity                     Responsibility          Key considerations
  -------------------------- ----------------------- -----------------------
  `PerformanceCycle`         Period and lifecycle    Tenant, dates, status,
                                                     selected framework

  `FrameworkType`            Supported methodology   OKR, MBO, BSC;
                             identifier              controlled choices

  `FrameworkConfiguration`   Tenant-specific         Versioned, validated
                             settings                configuration

  `FrameworkVersion`         Immutable rule version  Scoring, workflow and
                                                     template version

  `PerformanceAssignment`    Participant/owner       Employee/team/unit and
                             assignment              cycle

  `PerformanceObjective`     Common objective        Minimal shared fields
                             identity/reference      only

  `PerformanceMeasure`       Common measurement      Direction, unit, data
                             reference               type

  `KPIDefinition`            Reusable KPI definition Definition, formula,
                                                     owner, source

  `PerformanceTarget`        Approved target         Period, value, unit,
                             instance                version

  `PerformanceEvidence`      Evidence metadata       Storage key, owner,
                                                     access, checksum

  `PerformanceAssessment`    Assessment process      Subject, assessor,
                                                     stage, status

  `AssessmentScore`          Result detail           Raw, normalised,
                                                     weighted, rating

  `PerformanceApproval`      Approval decision       Actor, decision,
                                                     timestamp, comment

  `CalibrationRecord`        Moderation event        Original and adjusted
                                                     result, rationale

  `DevelopmentAction`        Follow-up action        Skill gap, action,
                                                     owner, due date

  `AuditEvent`               Business audit trail    Actor, tenant, action,
                                                     object, before/after
  --------------------------------------------------------------------------

### 5.2 Data model rules

1.  Every tenant-owned record must have an explicit, consistently
    enforced tenant/company scope, directly or through a validated
    parent relationship.
2.  Use database constraints for invariants that can be expressed safely
    at database level.
3.  Add indexes for tenant, cycle, employee, status, dates and
    frequently filtered foreign keys.
4.  Use `DecimalField` for targets, weights and scores where decimal
    precision matters. Do not use binary floating point for
    authoritative financial or score calculations.
5.  Store units and measurement direction explicitly. Do not infer them
    from KPI names.
6.  Store timestamps consistently (UTC in the database); render in the
    user's configured timezone.
7.  Define deletion policy deliberately. Prefer protected or soft-delete
    behaviour for approved/certified performance records.
8.  Use explicit status fields and valid state transitions. Avoid
    free-text status values.
9.  Use unique constraints scoped to tenant/cycle/owner where business
    rules require uniqueness.
10. Do not store calculated results as the only source of truth.
    Preserve input values and calculation version so results can be
    reproduced.
11. Use JSON fields only for genuinely flexible configuration or
    provider payloads. Do not hide core relational data in unvalidated
    JSON.
12. Add `created_at`, `updated_at`, `created_by` and `updated_by`
    consistently where applicable.

### 5.3 Cycle lifecycle

Recommended cycle states:

``` text
DRAFT -> CONFIGURED -> APPROVED -> ACTIVE -> REVIEW
      -> CALIBRATION -> APPROVAL -> CERTIFIED -> PUBLISHED -> CLOSED
```

Not every organisation needs every stage. Configuration may omit
optional stages, but state transitions must remain controlled.

Rules:

-   Only authorised users may change cycle state.
-   A cycle cannot become active until framework configuration, dates,
    participants and required workflow settings pass validation.
-   Approved plans are locked against silent edits.
-   Reopening a cycle requires a reason, permission and audit event.
-   Closing a cycle must not delete historical data.
-   A published/certified result must not be overwritten; corrections
    require a controlled amendment or superseding result.

### 5.4 Performance assignment

An assignment links a cycle to an employee, team, department or
organisational unit. Support the relevant assignment types without
assuming that all cycles require individual assignments.

Record:

-   Tenant/company.
-   Cycle.
-   Subject type and subject reference.
-   Framework configuration/version.
-   Responsible manager/owner.
-   Effective dates.
-   Assignment status.
-   Applicable scorecard/objective set.
-   Workflow route.
-   Created/approved metadata.

Enforce that the assignment subject belongs to the same tenant and is
eligible for the cycle.

------------------------------------------------------------------------

## 6. KPI and measure catalogue

A shared KPI catalogue is a major reusable capability, but a KPI
definition must be separated from its use in a specific cycle.

### 6.1 KPI definition fields

At minimum:

-   Name and unique tenant-scoped code.
-   Description and business rationale.
-   Category and optional industry tag.
-   Unit of measure.
-   Data type: numeric, percentage, currency, count, duration, rating,
    binary, milestone or qualitative.
-   Direction: higher-is-better, lower-is-better, exact, within-range,
    milestone or qualitative.
-   Formula/measurement definition.
-   Data source and source owner.
-   Frequency.
-   Leading/lagging indicator classification.
-   Evidence requirements.
-   Active/retired status.
-   Version and effective dates.

### 6.2 KPI reuse

A KPI definition may be reused across cycles and frameworks, but each
use must have its own:

-   Target.
-   Weight.
-   Measurement period.
-   Scoring configuration.
-   Owner.
-   Evidence rules.
-   Approval status.

Never mutate a shared KPI definition in a way that silently changes
historical cycles. Version definitions or create a new version and
preserve the version referenced by existing plans.

### 6.3 Target agreement and change control

Targets should have draft, submitted, approved and superseded states.

After approval, a target change must capture:

-   Original target and unit.
-   New target and unit.
-   Effective date.
-   Reason.
-   Requestor.
-   Approver.
-   Timestamp.
-   Impact on prior and future measurements.

A target change must not retroactively improve a result unless the
approved change policy explicitly requires recalculation. Any
recalculation must retain the original result and record the reason and
rule version.

------------------------------------------------------------------------

## 7. MBO implementation specification

### 7.1 MBO models

Suggested domain entities:

-   `MBOObjective`
-   `MBOExpectedOutcome`
-   `MBOTarget`
-   `MBOMeasurement`
-   `MBOAgreement`
-   `MBOReview`

Adapt naming to repository conventions and avoid duplicating common
target/evidence entities.

### 7.2 MBO objective fields

Each objective should support:

-   Title and description.
-   Business rationale/alignment.
-   Category.
-   Owner/employee.
-   Manager.
-   Cycle and assignment.
-   Expected outcome.
-   Measurement method.
-   Target value and unit.
-   Direction.
-   Weight.
-   Start and due dates.
-   Evidence requirements.
-   Status.
-   Agreement and approval metadata.

An objective may have one or more measures where required. Do not assume
one objective always equals one KPI.

### 7.3 MBO workflow

1.  Manager or authorised planner drafts objectives.
2.  Employee reviews and discusses objectives.
3.  Employee and manager record agreement.
4.  Designated authority approves the plan.
5.  Approved objectives and targets are locked.
6.  Employee records periodic actuals and evidence.
7.  Manager reviews progress and provides feedback.
8.  Employee submits self-assessment.
9.  Supervisor submits assessment.
10. Configured secondary review/HR checks take place.
11. Calibration and approval occur.
12. Result is certified and published.
13. Development actions are created where applicable.

Support configurable review frequencies and mid-cycle reviews.

### 7.4 MBO measurement and scoring

Implement scoring as pure functions in a dedicated MBO scoring adapter.
Every calculation must declare:

-   Input values.
-   Measurement direction.
-   Target and unit.
-   Thresholds.
-   Cap/floor.
-   Weight.
-   Missing-data policy.
-   Rounding policy.
-   Scoring-rule version.

Illustrative formula for higher-is-better:

`achievement_pct = actual / target * 100`

Illustrative formula for lower-is-better:

`achievement_pct = target / actual * 100`

These formulas are not sufficient on their own. Explicitly handle:

-   Target equal to zero.
-   Actual equal to zero.
-   Negative values.
-   Missing actual.
-   Actual outside expected range.
-   Target and actual unit mismatch.
-   Threshold-based performance.
-   Exact or within-range measures.
-   Milestone completion.
-   Qualitative ratings.
-   Maximum achievement cap and minimum threshold.
-   Partial periods and prorating, if enabled.

Do not divide by zero or silently substitute values. Invalid or
undefined cases must produce a validation result or an explicitly
configured outcome.

For qualitative objectives, use a configured rating rubric with
descriptions and evidence expectations. Do not pretend qualitative
ratings are mathematically equivalent to percentage achievement.

### 7.5 MBO acceptance tests

-   An employee cannot agree to another employee's objective without
    authority.
-   A plan cannot be approved if required objectives or weights are
    invalid.
-   Approved targets cannot be edited directly.
-   A target amendment preserves the old value and audit history.
-   Higher-is-better and lower-is-better formulas are independently
    tested.
-   Zero, negative, missing and out-of-range values are covered.
-   Weighted results reconcile exactly to the approved calculation
    policy.
-   Employee and supervisor assessments remain distinct.
-   A manager cannot certify their own result where separation of duties
    is required.

------------------------------------------------------------------------

## 8. BSC implementation specification

### 8.1 BSC domain entities

Suggested entities:

-   `BSCScorecard`
-   `BSCPerspective`
-   `BSCStrategicTheme`
-   `BSCStrategicObjective`
-   `BSCStrategyMap`
-   `BSCObjectiveLink`
-   `BSCMeasure`
-   `BSCInitiative`
-   `BSCScorecardAssignment`
-   `BSCPerformanceResult`

Reuse shared KPI definitions, targets, evidence, assignments and
assessment infrastructure where appropriate.

### 8.2 Four perspectives

Provide standard seeded perspective definitions:

1.  Financial.
2.  Customer.
3.  Internal Business Processes.
4.  Learning and Growth.

Allow tenant-level display labels and ordering where appropriate, but
preserve a stable system identifier for each standard perspective. If
custom perspectives are later permitted, treat them as an explicit
extension rather than silently replacing the standard BSC model.

### 8.3 Strategy maps

Support:

-   Strategic themes.
-   Strategic objectives.
-   Perspective association.
-   Cause-and-effect links.
-   Visual ordering and layout metadata.
-   Objective ownership.
-   Strategic initiative association.
-   Status and review dates.

A strategy-map link represents a management hypothesis or intended
causal relationship, not proof of causation. Reports must not imply
causality solely because a link exists.

Prevent invalid self-links and cycles in the objective dependency graph
unless a future, explicitly designed use case supports them. Validate
links within the same tenant and scorecard strategy context.

### 8.4 Scorecard structure

A scorecard must support:

-   Enterprise, business unit, department, team and individual scope.
-   One or more strategic themes.
-   Four perspectives.
-   Strategic objectives.
-   Measures/KPIs.
-   Targets and actuals.
-   Perspective and measure weights.
-   Initiatives.
-   Owner and accountable manager.
-   Review frequency.
-   Approval status.
-   Effective dates and version.

Do not force every employee to have measures in all four perspectives. A
scorecard can contain only relevant perspectives and measures, provided
the approved weighting rules are internally consistent.

### 8.5 Cascading and alignment

Cascading must be explicit and controlled:

-   Enterprise objective can be linked to business-unit objectives.
-   Business-unit objectives can be linked to departmental objectives.
-   Departmental objectives can be linked to team/individual
    contributions.
-   A child objective may contribute to more than one parent only if the
    business rule permits it.
-   Parent-child links must be auditable.
-   Cascading does not automatically copy targets or weights.
-   Child targets may be different from parent targets and must be
    approved independently.
-   Aggregation must use an explicitly configured rule; do not sum
    percentages or targets blindly.

Support alignment without requiring every individual KPI to be a direct
numeric decomposition of an enterprise KPI.

### 8.6 BSC scoring

At a high level:

`overall_score = sum(perspective_weight * perspective_score)`

Each perspective score is calculated from its eligible measures using
configured weights and scoring adapters.

Validate:

-   Perspective weights sum to the configured total (normally 100%).
-   Measure weights within a perspective sum to that perspective's
    allocation or 100% relative to the perspective, according to one
    clearly selected storage convention.
-   The storage convention is consistent across the application.
-   Empty perspectives are not assigned an implicit zero or 100.
-   Missing measures follow an explicit policy: block, mark incomplete,
    exclude with approved renormalisation, or another configured rule.
-   Directionality and units are honoured.
-   Leading and lagging indicators can be reported separately.
-   All calculations retain their rule version and inputs.

**Recommendation:** Store measure weights as percentages relative to
their perspective (sum to 100% within each populated perspective), and
perspective weights as percentages of the total score (sum to 100%).
Calculate the effective KPI contribution as perspective weight
multiplied by relative measure weight. If product requirements choose
another convention, document it and test it end-to-end.

### 8.7 BSC acceptance tests

-   A scorecard can be created with the standard perspectives.
-   Relevant employee scorecards can omit perspectives.
-   Perspective weights validate correctly.
-   Measure weights validate within each perspective.
-   Strategy-map links cannot cross tenant boundaries.
-   Invalid cycles/self-links are rejected.
-   Cascading does not silently copy targets or weights.
-   Parent/child relationships are auditable.
-   Department and enterprise rollups use approved aggregation rules.
-   A missing KPI does not silently become zero.
-   BSC reports reconcile to the certified scorecard.

------------------------------------------------------------------------

## 9. Unified evaluation, scoring and calibration

### 9.1 Common result contract

Framework scoring adapters should return a common result structure
containing at least:

-   Tenant and cycle identifiers.
-   Framework and rule version.
-   Subject and assignment.
-   Raw measurement/achievement.
-   Normalised score, where applicable.
-   Weighted score.
-   Rating/band, where configured.
-   Completeness status.
-   Evidence references.
-   Confidence/quality indicators, if used.
-   Calculation timestamp.
-   Input snapshot/version.
-   Validation warnings and blocking errors.

The common result contract is for workflow, reporting and
interoperability. It must not erase framework-specific details.

### 9.2 Scoring architecture

Use separate adapters:

``` text
ScoringAdapter
  ├── OKRScoringAdapter
  ├── MBOScoringAdapter
  └── BSCScoringAdapter
```

The actual interface should follow repository conventions and use typed
inputs/outputs where practical. Scoring functions should be
deterministic and independently unit-testable.

Do not place authoritative scoring formulas in templates, JavaScript,
serializers or model `save()` methods.

### 9.3 Rating scales

Support tenant-configurable rating scales, for example:

    Rating Illustrative label
  -------- ----------------------
         1 Unsatisfactory
         2 Needs improvement
         3 Meets expectations
         4 Exceeds expectations
         5 Outstanding

These are illustrative defaults only. Tenants may configure scales and
thresholds. Preserve raw achievement and final rating separately.

### 9.4 Weighting controls

-   Validate applicable weights before approval.
-   Do not silently redistribute weights.
-   Reject negative weights.
-   Define whether zero weight is allowed for a specific measure.
-   Store decimal precision consistently.
-   Apply rounding only at defined presentation/certification
    boundaries.
-   Version all scoring rules.
-   Preserve calculation inputs and results for reproduction.

### 9.5 Calibration

Calibration must be a controlled workflow, not an editable score field.

Record:

-   Original calculated score/rating.
-   Proposed calibrated score/rating.
-   Final approved score/rating.
-   Reason and evidence.
-   Calibrator and committee.
-   Timestamp.
-   Applicable policy.
-   Approval and dissent/comments where required.

Calibration changes must not overwrite the original calculated result.
Use a separate calibration outcome or adjustment record.

### 9.6 Separation of duties

Support configurable controls such as:

-   Employee cannot approve own assessment.
-   Manager cannot certify own performance.
-   HR quality review is distinct from supervisor assessment.
-   Calibration committee membership is controlled.
-   Final approval authority is configurable.
-   Emergency overrides require reason and audit.

------------------------------------------------------------------------

## 10. Workflow and state management

ScoReview leverages **Cloudflare Workflows** (`PerformanceReviewWorkflow`)
alongside Cloudflare Queues to execute multi-stage performance cycles durably.
Long-running workflows survive edge worker evictions, maintain state across
step pauses, and provide automated retries with deterministic step execution.

### 10.1 Workflow capabilities

-   **Cloudflare Workflows Engine:** Implemented via `WorkflowEntrypoint`,
    executing stages as discrete `step.do()` calls with automatic persistence.
-   Configurable stages matching the 10-stage lifecycle state machine.
-   Role- and relationship-based task assignment.
-   Submit, return, reject, approve and reopen actions.
-   Due dates, reminders, and scheduled stage advancement (`step.sleep()`).
-   Escalation and timeout handlers.
-   Comments and supporting evidence references.
-   Delegation with complete audit trail.
-   Stage-specific permissions and role validation.
-   Notifications dispatched via `hr-jobs-queue`.
-   Immutable workflow step history recorded in PostgreSQL `audit_logs`.

### 10.2 State transition controls

Each transition must validate:

-   Current state against the valid transition matrix (ADR-0005).
-   Actor permission (`admin`, `manager`, `employee`, `calibrator`).
-   Tenant scope (`company_id` integrity).
-   Required fields and evidence completeness.
-   Weight/target completeness (e.g. weights sum to 100%).
-   Separation-of-duties rules (e.g. manager cannot certify their own review).
-   Cycle status (cannot submit reviews in draft or closed cycles).
-   Any required preceding approvals.

Use database transactions and optimistic locking to prevent race conditions
during concurrent reviewer submissions.

### 10.3 Notifications

Notifications are dispatched asynchronously via `hr-jobs-queue` with message
type `notification_dispatch`. Handlers support email delivery, in-app KV alerts,
and webhook integrations without blocking HTTP request latency. Retries and
dead-letter logging prevent silent notification drops.

------------------------------------------------------------------------

## 11. Multi-tenancy and authorisation

Security and strict tenant isolation are release-blocking requirements.

### 11.1 Tenant isolation (Edge & Database Enforcement)

Per ADR-0005 and ADR-0015, tenant isolation operates across two coordinated layers:

1. **Edge Middleware Layer (`apps/hr-api/src/index.ts`):**
   - Every API route (`/api/v1/*`, including `/session`) passes through the `authenticate` middleware
     (`apps/hr-api/src/auth.ts`). Only `/` and `/health` are public.
   - Requires `Authorization: Bearer <JWT>`: HS256 only, signature checked against the `AUTH_JWT_SECRET`
     Worker secret (at least 32 characters), `iss` = `scoreview-auth`, `aud` = `hr-api`, `exp` required.
   - Takes the tenant from the token, never from the request: `company_id` (positive integer),
     `sub` (user id) and `role` (one of `employee`, `line_manager`, `hr_admin`, `hr_director`) are injected as the
     `TenantContext` (`c.set("tenant", ...)`). `X-Company-ID`, `X-User-ID` and `X-User-Role` headers are ignored.
   - Rejects a missing, malformed, expired, unsigned or wrongly signed token with HTTP 401 (no reason given)
     before any database work, and fails closed with HTTP 500 if the secret is missing or too short.
   - `authenticate` must stay registered above every `/api/v1` route (Hono runs handlers in registration
     order); `apps/hr-api/test/wiring.test.ts` enforces this.
   - Tokens come from passwordless magic-link sign-in (`apps/hr-api/src/magic-link.ts`, `auth-routes.ts`),
     mounted at `/auth` outside `/api/v1`: `POST /auth/magic-link` {email} always answers 202; `POST /auth/verify`
     {token} returns a 1-hour bearer token. Links are one-time, valid 10 minutes, stored in KV as a SHA-256 hash
     (`ml:`), throttled per address (`mlr:`), carried in the URL fragment, and built from `FRONTEND_URL` (never from
     the request). An address that matches more than one tenant is refused. KV single use is best-effort (eventual
     consistency); strict single use would need a Durable Object.
   - The access role comes from `employees.access_role` (`db/migrations/0001_employees_access_role.sql`), re-read
     at redemption. `employees.role` is a job title and is never used for authorization. KV session keys are
     prefixed `sess:` so a caller cannot plant a forged `ml:` entry (`test/wiring.test.ts` enforces it).
   - The frontend signs in through `/login` (asks for the email) and `/login/verify#token=...` (redeems the link,
     then `POST /api/session` stores the access token in an httpOnly, SameSite=Lax cookie, same-origin requests
     only). `apps/hr-frontend/src/app/page.tsx` reads the cookie, sends it as a Bearer token, loads
     `GET /api/v1/me` for the signed-in user, and redirects to `/login` when there is no valid session. Sign-out
     clears the cookie. `NEXT_PUBLIC_DEMO_LOGIN=1` restores the old persona picker (no real sign-in) for demos.
   - Open: a mail provider (links are only printed to the worker log when `MAGIC_LINK_DEV_LOG=1`).

2. **Relational PostgreSQL Layer (`db/schema.sql`):**
   - Every tenant-owned table (`employees`, `performance_cycles`, `kpis`, `framework_configurations`, etc.)
     maintains a direct `company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE`.
   - All SQL queries generated by Hono endpoints or queue consumers enforce `WHERE company_id = ${tenant.companyId}`.
   - Unique constraints are tenant-scoped (e.g. `UNIQUE (company_id, email)` on employees, `UNIQUE (company_id, name)` on departments).
   - Cross-tenant foreign keys are rejected at the database schema level.

PostgreSQL Row Level Security (RLS) is supported on Neon as defence-in-depth,
but application-level scoping remains the primary isolation guarantee.

### 11.2 Permission layers

Domain permissions enforced at the edge API:

-   Configure framework (`admin`).
-   Create/edit objectives (`manager`, `admin`, `employee` for self).
-   Approve objectives (`manager`, `admin`).
-   Submit actuals/evidence (`employee`, `manager`).
-   Assess (`employee` for self-assessment, `manager` for supervisor assessment).
-   Review (`manager`, `hr_admin`).
-   Calibrate (`calibrator`, `hr_admin`).
-   Certify (`hr_admin`, `executive`).
-   Publish (`hr_admin`).
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

## 12. Cloud SaaS and portable deployment

### 12.1 Unified edge monorepo requirement

Maintain one monorepo codebase (`hr-platform/`) and versioned deployment artefacts.
Use Cloudflare Workers bindings and environment configuration rather than
divergent codebases.

### 12.2 Cloudflare SaaS profile (Production)

Per ADR-0015, the production SaaS deployment runs on Cloudflare's global edge network:

-   **Frontend Edge Delivery:** `apps/hr-frontend` powered by Next.js 15 App Router,
    bundled via `@opennextjs/cloudflare`, served globally on Cloudflare Workers with
    custom domain binding (e.g. `hr.bscscoreview.com`).
-   **API Edge Gateway:** `apps/hr-api` powered by Hono on Cloudflare Workers, handling
    stateless authentication, multi-tenancy enforcement, and route handlers with
    sub-50ms execution.
-   **Database Acceleration:** **Cloudflare Hyperdrive** (`hr-db`, ID `d1468c75b19f437b994c969eb1fa2b41`),
    pooling connections from edge nodes directly to regional Postgres, maintaining
    active pool connections and accelerating SSL handshakes.
-   **Serverless Database:** **Neon Lakebase PostgreSQL** (`aws-eu-west-2`, London),
    providing copy-on-write branching for preview environments, scale-to-zero compute,
    and Decoupled storage architecture.
-   **Session & Token Storage:** **Cloudflare KV** (`SESSIONS`, ID `ab360608196c48c5b8958d5e6ce7d8ff`),
    providing globally replicated, low-latency key-value storage for user sessions and state.
-   **Async Task Processing:** **Cloudflare Queues** (`hr-jobs-queue`), delivering messages
    to `apps/hr-jobs` with dead-letter queue routing (`hr-jobs-dlq`) and configurable retries.
-   **Durable State Orchestration:** **Cloudflare Workflows** (`PerformanceReviewWorkflow`),
    managing long-running cycle lifecycles, automated reminder steps, and approval gates.
-   **Object & Evidence Storage:** Cloudflare R2 / S3-compatible Neon Object Storage for
    performance evidence and document attachments with pre-signed URLs.
-   **Observability:** Cloudflare Workers Observability and Neon Loki/Grafana telemetry.

### 12.3 Portable / Customer-managed profile

For customer-managed, air-gapped, or hybrid installations:

-   **Schema Portability:** The canonical database schema (`db/schema.sql`) uses standard
    ANSI PostgreSQL DDL and runs on any standard PostgreSQL 15+ engine.
-   **Container Runtime:** Node.js / Docker container profile packaging Hono API and
    Next.js frontend with direct `DATABASE_URL` connection strings when deployed outside
    the Cloudflare edge.
-   **Local Development:** `npm run dev` orchestrates all three apps simultaneously on
    `localhost` (`8787` for API, `8788` for Jobs, and `3000` for Frontend), binding
    to local or remote Neon instances cleanly.

### 12.4 Environment configuration

Wrangler configuration files (`wrangler.jsonc`) define infrastructure bindings declaratively:

-   `apps/hr-api/wrangler.jsonc`: `HYPERDRIVE`, `SESSIONS` (KV), `JOBS_QUEUE`, `REVIEW_WORKFLOW`.
-   `apps/hr-jobs/wrangler.jsonc`: `HYPERDRIVE`, `SESSIONS` (KV), queue consumers with DLQ, `REVIEW_WORKFLOW`.
-   `apps/hr-frontend/wrangler.jsonc`: Static assets and OpenNext runtime configuration.

Secrets (such as database credentials or API keys) are managed via `wrangler secret put`
or Cloudflare Dashboard environment variables—never committed to source control.

------------------------------------------------------------------------

## 13. Background processing, queues and workflows

Cloudflare Queues and Cloudflare Workflows replace legacy Celery/Redis infrastructure,
eliminating container management, worker scaling bottlenecks, and broker maintenance.

### 13.1 Cloudflare Queues architecture

The queue system is split into two coordinated Cloudflare Queues:

-   **Main Processing Queue (`hr-jobs-queue`):**
    - Handled by `apps/hr-jobs/src/index.ts`.
    - Consumer settings: `max_batch_size: 10`, `max_batch_timeout: 5s`.
    - Supported message types (`JobMessage` schema in `packages/shared`):
      - `score_calculation`: Deterministic recalculation of employee/cycle scores.
      - `kpi_created`: Real-time audit and notification broadcast.
      - `notification_dispatch`: Email and in-app alert delivery.
      - `report_generation`: Heavy PDF or CSV generation.
-   **Dead Letter Queue (`hr-jobs-dlq`):**
    - Automatically captures messages that exceed `max_retries: 3`.
    - Prevents head-of-line blocking and poison pill messages.
    - Inspectable for reconciliation and manual replay.

### 13.2 Cloudflare Workflows (`PerformanceReviewWorkflow`)

Multi-week review cycles and approval chains cannot rely on transient queues.
Cloudflare Workflows provide durable, distributed state machine execution:

-   Defined as `class PerformanceReviewWorkflow extends WorkflowEntrypoint`.
-   Steps run with automatic retries and durable state persistence (`step.do()`).
-   Supports multi-day pauses (`step.sleep()`) for review completion deadlines.
-   Emits structured audit records to PostgreSQL upon completion of each lifecycle stage.

### 13.3 Job safety & idempotency

Every queue job and workflow step must:

-   Be idempotent via unique message keys.
-   Enforce strict `company_id` tenant scoping.
-   Maintain explicit status logging in PostgreSQL `audit_logs`.
-   Execute within sub-request memory and CPU limits.

Do not execute long-running work in HTTP request/response handlers.

------------------------------------------------------------------------

## 14. Documents, evidence and data processing

### 14.1 Evidence repository

Store document metadata in PostgreSQL and document bytes in configured
object/file storage.

Metadata should include:

-   Tenant.
-   Related cycle, assignment, objective, KPI or assessment.
-   Uploader and upload timestamp.
-   Original filename and safe storage key.
-   MIME type and size.
-   Checksum.
-   Malware scan status where supported.
-   Access classification.
-   Retention/deletion status.

Do not expose predictable public media URLs for confidential appraisal
documents. Authorise every download. Use short-lived signed URLs only
after permission checks.

### 14.2 PDF generation

The current pdfkit/wkhtmltopdf dependency is a known technical risk.
Review the exact dependency advisory and supported alternatives. Plan to
replace the vulnerable/unsupported path with a maintained rendering
approach appropriate to the product.

Possible alternatives include HTML-to-PDF engines with maintained
browser runtimes, xhtml2pdf or ReportLab depending on layout
requirements. Validate page layout, fonts, Unicode, tables, charts and
accessibility before selecting.

Do not simply remove pdfkit before all existing report paths have been
migrated and tested.

### 14.3 Spreadsheet processing

Use openpyxl/XlsxWriter/pandas where appropriate. For imports:

-   Validate file type, size and row limits.
-   Validate schema and required columns.
-   Preview errors before commit.
-   Support dry-run.
-   Prevent formula injection in exported spreadsheets.
-   Record import batch, uploader, errors and outcome.
-   Make imports transactional or use staging tables and controlled
    commit.
-   Do not partially apply a batch without an explicit partial-success
    policy.

### 14.4 Other libraries

Review PyMuPDF, spaCy, geopy, pyzk and Google API clients. Keep optional
heavyweight libraries out of the base image if not required by all
deployments. Use optional dependency groups or separate worker images
where this materially reduces attack surface and image size.

------------------------------------------------------------------------

## 15. Frontend and user experience

### 15.1 Edge-rendered frontend (`apps/hr-frontend`)

Per ADR-0015, the frontend is built using **Next.js 15 App Router** and **React 19**,
compiled into an edge worker bundle via **`@opennextjs/cloudflare`**:

-   **Edge Server Components:** Fetch data directly from `apps/hr-api` on the
    Cloudflare edge network, eliminating client round-trips and rendering HTML instantly.
-   **Static & Asset Optimization:** Next.js assets and client bundles are served
    directly from Cloudflare's global CDN cache.
-   **Responsive Layout:** Accessible, modern interface built with Tailwind CSS.

### 15.2 Role-appropriate views

Provide tailored experiences for:

-   Platform and company administrators.
-   HR/performance administrators.
-   Managers and department leads.
-   Employees.
-   Calibration committees.
-   Executive leadership.

### 15.3 Required screens

-   **Performance Dashboard (`/`):** Real-time cycle statuses, company scorecards,
    and employee review progress.
-   **Cycle Management (`/cycles`):** Cycle creation, 10-stage lifecycle progression,
    and framework selection (OKR, MBO, BSC).
-   **Team Directory (`/employees`):** Department rosters, manager-employee reporting
    chains, and review assignment statuses.
-   **Objective & KPI Workspace (`/kpis`):** Measurable targets, actuals, weights,
    and evidence attachments.
-   **Assessment & Calibration Workspace (`/reviews`):** Dual employee self-assessment
    and supervisor evaluation interfaces with deterministic score calculation.
-   **Evidence Centre:** Document and proof submission interface backed by secure
    pre-signed object storage.

### 15.4 Frontend engineering rules

-   Server components validate all data server-side; client credentials are never leaked.
-   CSRF protection and secure HTTP-only cookies managed via Cloudflare KV sessions.
-   Loading, empty, error, and success states for all asynchronous operations.
-   Accessible labels, keyboard navigation, and WCAG AA contrast compliance.
-   Authoritative scores are **always** computed server-side by deterministic algorithms;
    never calculate or round scores in the browser.

------------------------------------------------------------------------

## 16. API design and integration

### 16.1 Hono REST API Worker (`apps/hr-api`)

The primary backend API is implemented in TypeScript using **Hono** on Cloudflare Workers,
offering minimal memory footprint, zero cold starts, and full TypeScript type safety
paired with Zod runtime validation.

#### Implemented Endpoints:

``` text
# Health & Service Discovery
GET  /                              # API service metadata & endpoint directory
GET  /health                        # Edge liveness & readiness check

# KV Session & Auth
POST /api/v1/session                # Store authenticated session in Cloudflare KV
GET  /api/v1/session/:id            # Retrieve session metadata from KV

# Employees & Hierarchy (Tenant Scoped)
GET  /api/v1/employees              # List employees for tenant
POST /api/v1/employees              # Create employee record

# Performance Cycles & Lifecycle
GET  /api/v1/cycles                 # List cycles with status
POST /api/v1/cycles                 # Create new cycle (validates dates & framework)
PATCH /api/v1/cycles/:id/status     # 10-stage state machine transition

# KPIs & Catalog
GET  /api/v1/kpis                   # List KPI definitions
POST /api/v1/kpis                   # Create KPI and enqueue broadcast job

# Asynchronous Scoring & Evaluation
POST /api/v1/score/calculate        # Enqueue deterministic scoring to hr-jobs-queue
```

### 16.2 API security and validation

-   **Authentication and Multi-Tenancy Enforcement:** Every `/api/v1/*` endpoint
    requires a valid signed bearer token; the tenant, user and role come from its
    claims (section 11.1). A missing or invalid token returns HTTP 401 immediately.
-   **Zod Runtime Validation:** Request bodies are strictly validated via `@hono/zod-validator`
    and centralized Zod schemas in `@hr-platform/shared`. Invalid inputs return structured
    JSON error messages before database queries execute.
-   **Hyperdrive Connection Pooling:** All database interactions use `c.env.HYPERDRIVE.connectionString`
    with `postgres.js`, pooling connections across global edge locations.
-   **Asynchronous Queue Offloading:** Heavy tasks (such as scorecard re-calculation
    or notification delivery) are offloaded to `c.env.JOBS_QUEUE.send(...)` and handled
    out-of-band by `apps/hr-jobs`.

------------------------------------------------------------------------

## 17. AI capability and governance

AI is a shared assistive service, not a separate performance
methodology.

### 17.1 Supported use cases

-   SMART objective quality suggestions.
-   KPI definition and measurement quality checks.
-   Target reasonableness prompts.
-   Evidence relevance/completeness suggestions.
-   Draft performance narratives.
-   Development and learning recommendations.
-   Trend and anomaly explanations.
-   Manager preparation summaries.

### 17.2 AI controls

-   AI output must be labelled `PROPOSED` or equivalent until a human
    acts.
-   AI must never silently modify approved objectives, targets, weights
    or scores.
-   AI must never certify a performance result.
-   Store provider/model/version, request purpose, timestamp, output
    reference, confidence where available and human disposition.
-   Record prompt/template version and relevant source references,
    subject to privacy policy.
-   Minimise personal data sent to external providers.
-   Provide tenant-level AI enable/disable and provider configuration.
-   Support private/local AI or disabled mode for on-premises
    deployments.
-   Prevent one tenant's data from entering another tenant's prompts,
    retrieval or caches.
-   Do not use employee data for provider model training unless the
    organisation has explicitly approved the applicable terms and lawful
    basis.
-   Provide a human review and correction path.
-   Test for hallucination, bias, prompt injection and disclosure of
    confidential information.

AI confidence must not be treated as proof of correctness. Do not use
AI-only inference to make employment decisions.

------------------------------------------------------------------------

## 18. Audit, privacy and compliance

### 18.1 Audit coverage

Record significant events, including:

-   Cycle creation/configuration and state changes.
-   Framework selection and configuration changes.
-   Objective and KPI creation/modification.
-   Target and weight changes.
-   Employee/manager agreement.
-   Actual submissions.
-   Evidence upload/download where required by policy.
-   Assessment submission and edits.
-   Approval, rejection, return and delegation.
-   Calibration proposals and outcomes.
-   Certification/publication.
-   Administrative access to sensitive records.
-   AI proposal generation and human disposition.
-   Export and bulk download events.

Audit records should identify actor, tenant, action, object, timestamp,
correlation/request ID and relevant before/after values. Avoid storing
unnecessary sensitive content in audit payloads.

### 18.2 Privacy and Ghana context

Support configurable retention, access, correction and deletion
workflows consistent with applicable law and customer policy. For Ghana
deployments, assess the Data Protection Act, 2012 (Act 843), Data
Protection Commission requirements and relevant sector rules. For
international customers, support their applicable privacy and employment
requirements.

Do not claim legal compliance solely because a feature exists. Obtain
customer/legal review for jurisdiction-specific configurations.

### 18.3 Data retention

Define retention policies for:

-   Performance records.
-   Evidence documents.
-   Audit events.
-   AI interaction records.
-   Exports and temporary files.
-   Backups.

Retention and deletion must account for legal holds, employment record
obligations and customer policy. Deletion must be authorised, logged and
tested.

------------------------------------------------------------------------

## 19. Reporting and analytics

### 19.1 Common reporting

Provide: - Employee performance summary. - Manager/team performance. -
Department performance. - Enterprise performance. - Cycle completion and
overdue actions. - Assessment status. - Rating distribution. -
Calibration adjustments. - Development needs. - KPI trend and
achievement. - Evidence completeness. - Framework adoption and usage.

### 19.2 Framework-specific reporting

OKR: - Objective progress. - Key Result achievement. -
Confidence/status. - Alignment and dependencies.

MBO: - Objective achievement. - Target versus actual. - Weighted
objective score. - Agreement and review completion.

BSC: - Perspective score. - Strategic objective achievement. - KPI
performance. - Strategy-map status. - Initiative progress. -
Department/enterprise roll-up.

### 19.3 Reporting controls

-   Reports must respect tenant and object permissions.
-   Suppress or aggregate sensitive small cohorts where appropriate.
-   Use certified results for official performance reporting.
-   Clearly distinguish draft, provisional, calibrated and certified
    data.
-   Exports must be audited.
-   Large reports must run asynchronously.
-   Reconcile report totals against source records and scoring results.

------------------------------------------------------------------------

## 20. Quality engineering and CI/CD

### 20.1 Required quality checks

Use the repository's existing tools where practical:

-   Ruff.
-   Pre-commit.
-   Gitleaks.
-   Django system checks.
-   Django test runner and/or existing test framework.
-   Coverage.
-   Dependency/security scanning.
-   CodeQL.
-   Container image scanning.
-   Migration checks.
-   API tests.
-   End-to-end tests.

Do not introduce competing tools without a clear reason.

### 20.2 Pull request requirements

Every pull request must include:

1.  Purpose and scope.
2.  Affected apps/models/endpoints.
3.  Migration details.
4.  Permission and tenant-isolation impact.
5.  Tests added/updated and results.
6.  Security considerations.
7.  Deployment/configuration changes.
8.  Documentation changes.
9.  Screenshots or API examples for user-facing changes.
10. Rollback or recovery notes for risky changes.

### 20.3 Test categories

**Unit tests** - Scoring formulas. - Validators. - State transitions. -
Weighting. - Target direction. - Rubric mapping.

**Integration tests** - Common engine to framework adapter. - ORM
constraints. - Evidence and storage. - Workflow and notifications. -
Scheduler/worker jobs.

**Security tests** - Tenant isolation. - Object permissions. - IDOR
attempts. - Export/download permissions. - JWT and session controls. -
Rate limiting.

**Regression tests** - Existing OKR flows. - Existing mobile/API
contracts. - Existing employee/company integrations. - Existing reports
and exports.

**End-to-end tests** - Complete OKR cycle. - Complete MBO cycle. -
Complete BSC cycle. - Cloud deployment smoke test. - On-premises
deployment smoke test.

### 20.4 Coverage and quality thresholds

Set thresholds based on a measured baseline. For new scoring,
permissions, tenant isolation and workflow code, require comprehensive
branch and edge-case tests. Do not use an overall coverage percentage to
excuse untested critical paths.

No release may proceed with: - Failing critical tests. - Known
cross-tenant access defects. - Unexplained score mismatches. - Unapplied
or unsafe migrations. - Exposed secrets. - Unreviewed high/critical
dependency vulnerabilities without an approved exception. - Broken
existing OKR critical paths.

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

## 23. Delivery phases and definition of done

The following are planning estimates only. Confirm scope after Phase 0
discovery.

### Phase 0 --- Architecture and codebase assessment

**Indicative duration:** 2 weeks.

Tasks: - Repository and environment inventory. - OKR model and workflow
mapping. - Horilla integration mapping. - Security and tenancy review. -
Database and migration assessment. - Existing test baseline. - Technical
debt and dependency review.

Deliverables: - `BASELINE_ASSESSMENT.md`. - Existing OKR behaviour
matrix. - Proposed domain model and relationship diagrams. - Risk
register. - Prioritised implementation backlog.

Exit gate: Product and engineering approve the architecture and scope
before structural changes.

### Phase 1 --- Common performance engine

**Indicative duration:** 3--5 weeks.

Tasks: - Framework registry/configuration. - Cycle lifecycle. -
Assignments. - Common objective references. - KPI/measure catalogue. -
Targets and evidence. - Shared workflow primitives. - Common
evaluation/result contract. - Audit and permissions.

Exit gate: Common engine works with a protected OKR regression suite; no
MBO/BSC scoring is yet required to be production complete.

### Phase 2 --- MBO

**Indicative duration:** 3--4 weeks.

Tasks: - MBO objective and agreement. - Targets and measurements. -
Manager/employee workflow. - MBO scoring adapter. - Assessment and
approvals. - MBO reporting.

Exit gate: Complete MBO cycle passes calculation, permission, audit and
end-to-end tests.

### Phase 3 --- BSC

**Indicative duration:** 4--6 weeks.

Tasks: - Scorecards and perspectives. - Strategic themes/objectives. -
Strategy maps. - Measures and initiatives. - Cascading. - Weighting and
BSC scoring adapter. - Scorecard reporting.

Exit gate: Complete enterprise-to-individual BSC flow passes
strategy-map, roll-up, weighting, permission and end-to-end tests.

### Phase 4 --- Unified intelligence

**Indicative duration:** 3--4 weeks.

Tasks: - Unified reporting. - Calibration. - Development planning. - AI
assistance and governance. - Cross-framework executive insights.

Exit gate: AI proposals are auditable and human-controlled; official
reports use certified results.

### Phase 5 --- Enterprise deployment readiness

**Indicative duration:** 3--4 weeks.

Tasks: - Cloud multi-tenant deployment testing. - On-premises
installation and upgrade testing. - Backup and restore. - Load and
security testing. - Observability. - Documentation and operational
handover.

Exit gate: Both deployment profiles can be installed, upgraded,
monitored and recovered using documented procedures.

------------------------------------------------------------------------

## 24. Global definition of done

A feature is not complete until all applicable items are satisfied:

-   Business rules are documented and approved.
-   Domain model and migrations are reviewed.
-   Tenant isolation is enforced.
-   Permissions are tested at service/API/view levels.
-   Input validation exists server-side.
-   State transitions are controlled.
-   Audit events are recorded.
-   Unit and integration tests pass.
-   Regression tests pass.
-   UI loading/empty/error/success states exist.
-   API documentation is updated.
-   Accessibility has been considered.
-   Logs contain useful correlation data without leaking sensitive
    information.
-   Background tasks are retry-safe where applicable.
-   Deployment configuration is documented.
-   Rollback/recovery impact is understood.
-   User-facing documentation is updated.

A screen that saves data is not, by itself, a completed feature.

------------------------------------------------------------------------

## 25. Required project documentation

Maintain these documents in the repository:

``` text
docs/
  architecture/
    MASTER_ARCHITECTURE.md
    BASELINE_ASSESSMENT.md
    DOMAIN_MODEL.md
    DATA_DICTIONARY.md
    TENANCY_AND_SECURITY.md
    DEPLOYMENT_CLOUD.md
    DEPLOYMENT_ON_PREMISES.md
    INTEGRATION_CONTRACTS.md
  frameworks/
    OKR_SPECIFICATION.md
    MBO_SPECIFICATION.md
    BSC_SPECIFICATION.md
    SCORING_AND_CALIBRATION.md
    WORKFLOW_SPECIFICATION.md
  engineering/
    DEVELOPMENT_SETUP.md
    TEST_STRATEGY.md
    MIGRATION_POLICY.md
    RELEASE_PROCESS.md
    OPERATIONS_RUNBOOK.md
    SECURITY_RESPONSE.md
  product/
    USER_ROLES_AND_PERMISSIONS.md
    REPORTING_CATALOGUE.md
    AI_GOVERNANCE.md
```

Keep this `BUILD.md` as the master implementation directive. Detailed
documents may expand it but must not contradict it. Record approved
deviations in an Architecture Decision Record (ADR).

------------------------------------------------------------------------

## 26. Architecture Decision Records

Create an ADR for decisions that materially affect data structures,
deployment, security, APIs or scoring.

Key accepted ADRs:

1.  **ADR-0001:** Initial baseline and scoping principles.
2.  **ADR-0002:** Framework selection per performance cycle.
3.  **ADR-0003:** Shared KPI catalogue and versioning.
4.  **ADR-0004:** Scoring adapter and deterministic contract.
5.  **ADR-0005:** Multi-tenancy isolation boundary.
6.  **ADR-0006:** *(Superseded by ADR-0015)* Cloud SaaS hosting on Docker/Gunicorn.
7.  **ADR-0007:** *(Superseded by ADR-0015)* Celery/Redis background task queue.
8.  **ADR-0008:** Evidence storage and document security.
9.  **ADR-0009:** AI provider and governance model.
10. **ADR-0010:** PDF rendering replacement.
11. **ADR-0015:** **Cloudflare SaaS Edge Architecture** *(Accepted)*
    - Monorepo structure (`hr-platform/`): Next.js 15 App Router, Hono REST API Worker.
    - Cloudflare Hyperdrive connection pooling to Neon Lakebase PostgreSQL.
    - Cloudflare Queues (`hr-jobs-queue`, `hr-jobs-dlq`) and Cloudflare Workflows.
    - Cloudflare KV (`SESSIONS`) for globally distributed session management.

------------------------------------------------------------------------

## 27. Developer execution instructions

The engineering team must follow this execution lifecycle:

### 27.1 Cloudflare SaaS Monorepo Workflow (`hr-platform/`)

1.  **Workspace Installation:**
    ```bash
    cd hr-platform
    npm install
    ```
2.  **Typecheck All Packages:**
    ```bash
    npm run typecheck       # Runs tsc -b across shared, api, jobs, frontend
    ```
3.  **Start Local Development:**
    ```bash
    npm run dev             # Starts concurrently: API (:8787), Jobs (:8788), Frontend (:3000)
    ```
4.  **Database Migration & Schema Updates:**
    - Canonical DDL is in [`hr-platform/db/schema.sql`](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/hr-platform/db/schema.sql).
    - Deploy changes to Neon Postgres:
      ```bash
      neon psql --file db/schema.sql
      ```
5.  **Deploy to Cloudflare:**
    ```bash
    npm run deploy:api      # Deploys hr-api Worker
    npm run deploy:jobs     # Deploys hr-jobs Queue consumer & Workflows
    npm run deploy:frontend # Builds OpenNext and deploys Next.js to Cloudflare
    ```
6.  **Custom Domain Attachment:**
    Attach custom domains (e.g. `hr.bscscoreview.com`) to the deployed frontend worker
    via the Cloudflare API or Dashboard.

### 27.2 Domain Reference Engine (`scoreview_core/`)

The Python/Django reference engine in [`scoreview_core/`](file:///c:/Users/paa.barnes/Downloads/07%20Deployments/ScoRePerf/scoreview_core/)
serves as the mathematical gold standard for scoring formulas, 10-stage lifecycle transitions,
and regression test verification:

```bash
python manage.py test scoreview_core.tests
```

All 15 unit tests and 41 OKR contract tests must pass with zero regressions whenever
scoring algorithms are updated.

### 27.3 Work management

Break work into small tickets with:

-   Unique ID.
-   Objective.
-   Scope and exclusions.
-   Dependencies.
-   Files/apps expected to change.
-   Data migration impact.
-   Security/permission impact.
-   Acceptance criteria.
-   Test cases.
-   Documentation requirements.

Do not combine unrelated refactoring with framework feature work unless
necessary and explicitly approved.

### 27.2 Session handover

At the end of every engineering session, update a handover note
containing:

-   Date and branch/commit.
-   Work completed.
-   Files changed.
-   Migrations added.
-   Tests executed and results.
-   Known failures and blockers.
-   Decisions made and ADRs updated.
-   Risks introduced or resolved.
-   Next exact tasks.
-   Commands needed to reproduce the state.

Do not report a task as complete merely because code was written. Report
its actual verification status.

------------------------------------------------------------------------

## 28. Explicit exclusions from the initial build

Unless separately approved, do not include:

-   A full SPA rewrite.
-   Microservice decomposition.
-   Payroll processing.
-   Recruitment or full HRMS replacement.
-   Automatic compensation or promotion decisions.
-   AI-only performance scoring or certification.
-   Automatic conversion of OKR records into MBO/BSC records.
-   Uncontrolled hybrid scoring across frameworks within one cycle.
-   Unreviewed changes to existing OKR calculations.
-   A generic workflow designer more complex than the required
    performance workflows.
-   Automatic target/weight redistribution.
-   Unversioned scoring-rule changes.
-   Unauthorised access to confidential performance records.

These exclusions protect the scope and keep the first multi-framework
release deliverable.

------------------------------------------------------------------------

## 29. Final engineering directive

Build ScoReview as a configurable, secure and auditable performance
management platform, not as three loosely connected appraisal forms.

The common engine must manage the organisational lifecycle and shared
services. OKR, MBO and BSC must retain their own domain models,
workflows and scoring rules. The evaluation layer must bring their
certified outcomes into a consistent reporting and management experience
without pretending that the methodologies are identical.

The existing OKR capability is a protected product asset. The current
Django/Horilla foundation is to be extended deliberately, with actual
codebase discovery preceding structural changes. Cloud and on-premises
deployments must remain release-aligned through a single codebase.

**Build in controlled phases. Validate every calculation. Enforce tenant
isolation everywhere. Preserve auditability. Keep AI advisory and
human-governed. Do not sacrifice framework integrity for superficial
code reuse.**

That is the standard against which the ScoReview implementation should
be designed, reviewed and accepted.
