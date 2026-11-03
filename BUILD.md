# ScoReview --- BUILD.md

## Comprehensive Developer Build Specification

**Document status:** Proposed implementation baseline\
**Product:** ScoReview Performance Management Platform\
**Architecture:** Modular Django monolith; cloud SaaS and on-premises
deployment\
**Frameworks:** OKR, MBO and Balanced Scorecard (BSC)\
**Primary audience:** Engineering, product, QA, DevOps, security and
implementation teams

------------------------------------------------------------------------

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

Use a shared workflow capability where it fits existing Horilla
patterns. Do not build an overly generic workflow designer for the MVP.

### 10.1 Workflow capabilities

-   Configurable stages.
-   Role- and relationship-based task assignment.
-   Submit, return, reject, approve and reopen actions.
-   Due dates and reminders.
-   Escalation.
-   Comments and supporting evidence.
-   Delegation with audit.
-   Stage-specific permissions.
-   Notifications.
-   Workflow history.

### 10.2 State transition controls

Each transition must validate:

-   Current state.
-   Actor permission.
-   Tenant scope.
-   Required fields and evidence.
-   Weight/target completeness.
-   Separation-of-duties rules.
-   Cycle status.
-   Any required preceding approvals.

Use atomic transactions and concurrency controls to prevent duplicate
approval or conflicting updates.

### 10.3 Notifications

Support in-app and email notifications, with optional channels according
to deployment configuration. Notifications should be queued, retryable
and deduplicated. Avoid sending mail inside a long database transaction.

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

### 15.1 Preserve the existing approach

Continue with Django templates and HTMX for partial updates, Alpine.js
or `_hyperscript` for small behaviours, and existing jQuery only where
legacy screens require it.

Do not introduce a full SPA solely for the new frameworks.

### 15.2 Frontend requirements

Provide role-appropriate experiences for:

-   Platform and company administrators.
-   HR/performance administrators.
-   Managers.
-   Employees.
-   Reviewers/calibrators.
-   Executives.

### 15.3 Required screens

Common: - Performance dashboard. - Cycle list/detail/configuration. -
Framework selection. - Participant/assignment management. - KPI
library. - Objective/target review. - Evidence centre. - Assessment
workspace. - Approval inbox. - Calibration workspace. - Development
plan. - Reports and exports.

MBO: - Objective agreement. - Target and measurement setup. - Progress
update. - Self-assessment. - Supervisor assessment. - MBO summary.

BSC: - Scorecard designer. - Perspective management. - Strategy map. -
Strategic objective management. - KPI/measure assignment. -
Cascading/alignment. - Scorecard results and drill-down.

OKR: - Preserve existing screens and flows unless a specific approved
change is required.

### 15.4 Frontend engineering rules

-   Compile Tailwind CSS at build time; do not rely on browser Tailwind
    CDN in production.
-   Use locally managed, pinned Chart.js assets rather than an unpinned
    CDN dependency.
-   Use CSRF protection for state-changing browser requests.
-   Validate all values server-side.
-   Make HTMX actions respect the same authentication and permission
    checks as full-page requests.
-   Provide loading, empty, error and success states.
-   Ensure accessible labels, keyboard navigation and sufficient
    contrast.
-   Do not present AI proposals as approved results.
-   Do not use client-side values as authoritative scores.
-   Keep branding/theme customisation compatible with existing
    `HorillaColorTheme` behaviour and migrations.

------------------------------------------------------------------------

## 16. API design and integration

### 16.1 API principles

Use Django REST Framework and the existing API conventions. Maintain
versioned endpoints and consistent serializers, permissions, pagination,
filtering and error formats.

Illustrative common endpoints:

``` text
/api/v1/performance/cycles/
/api/v1/performance/frameworks/
/api/v1/performance/assignments/
/api/v1/performance/objectives/
/api/v1/performance/kpis/
/api/v1/performance/targets/
/api/v1/performance/evidence/
/api/v1/performance/assessments/
/api/v1/performance/approvals/
/api/v1/performance/calibration/
/api/v1/performance/reports/
```

Framework endpoints:

``` text
/api/v1/okr/objectives/
/api/v1/okr/key-results/
/api/v1/okr/check-ins/

/api/v1/mbo/objectives/
/api/v1/mbo/agreements/
/api/v1/mbo/targets/
/api/v1/mbo/measurements/
/api/v1/mbo/reviews/

/api/v1/bsc/scorecards/
/api/v1/bsc/perspectives/
/api/v1/bsc/strategy-maps/
/api/v1/bsc/strategic-objectives/
/api/v1/bsc/measures/
/api/v1/bsc/initiatives/
```

These are proposed route patterns. Reconcile with existing mobile/API
contracts before changing routes.

### 16.2 API security and quality

-   Every endpoint must enforce authentication and object/tenant
    permissions.
-   Never trust company IDs, employee IDs or owner IDs from the request
    without validation.
-   Use serializers for input validation, not as the only business-rule
    layer.
-   Use service functions for state-changing operations.
-   Use idempotency for operations that may be retried.
-   Document response codes and validation errors.
-   Apply pagination and bounded filters.
-   Avoid N+1 queries.
-   Rate-limit sensitive endpoints.
-   Add API contract tests.
-   Preserve backward compatibility or version breaking changes.

### 16.3 Integrations

Design integration boundaries for:

-   Existing Horilla employee data.
-   LDAP/Active Directory.
-   Email systems.
-   Mobile clients.
-   HRIS/payroll platforms.
-   BI/reporting tools.
-   External data sources for KPI actuals.
-   AI providers.

Use explicit integration adapters and mapping tables. Do not allow
external systems to bypass business validation or write certified scores
directly.

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

Each ADR should include:

-   Number and title.
-   Status: proposed, accepted, superseded or rejected.
-   Context/problem.
-   Decision.
-   Alternatives considered.
-   Consequences and risks.
-   Migration/compatibility implications.
-   Approver and date.

Initial ADRs required:

1.  Modular Django monolith and domain boundaries.
2.  Framework selection per performance cycle.
3.  Shared KPI catalogue and versioning.
4.  Scoring adapter and result contract.
5.  Tenant isolation strategy.
6.  Cloud/on-prem deployment profiles.
7.  Background task queue.
8.  Evidence storage and document security.
9.  AI provider and governance model.
10. PDF rendering replacement.

------------------------------------------------------------------------

## 27. Developer execution instructions

The engineering team must follow this order:

1.  Read this BUILD.md and the current repository contribution
    instructions.
2.  Inspect the codebase and produce the Phase 0 baseline assessment.
3.  Run existing tests and record the baseline. Do not conceal known
    failures.
4.  Map existing OKR and Horilla models before proposing schema changes.
5.  Present the proposed model relationship diagram and migration plan
    for review.
6.  Agree the common domain contracts and framework boundaries.
7.  Implement the smallest vertical slice of the common engine.
8.  Add tests and demonstrate that existing OKR behaviour remains
    intact.
9.  Implement MBO as a complete vertical slice.
10. Implement BSC as a complete vertical slice.
11. Add unified reporting, calibration and AI capabilities in controlled
    increments.
12. Validate cloud and on-premises deployment profiles.
13. Update documentation and release notes with every meaningful change.

### 27.1 Work management

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
