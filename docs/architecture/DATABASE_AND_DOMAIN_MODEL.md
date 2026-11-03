# ScoReview — Database and Domain Model

> Shared performance domain, core entities, lifecycle, assignments, KPI catalogue, target agreement and data-model rules.

This is a companion document extracted from the comprehensive ScoReview `BUILD.md`. The master `BUILD.md` remains the controlling specification; where interpretation or cross-document dependencies arise, follow the master document and record material decisions as Architecture Decision Records.

## Source context

The ScoReview platform is being extended from its existing OKR capability to support MBO and Balanced Scorecard (BSC), with framework selection at performance-cycle level and one framework per cycle. The implementation must preserve existing OKR behaviour, reuse authoritative Horilla records, and support cloud SaaS and on-premises deployment.

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
