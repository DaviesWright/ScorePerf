# ScoReview — Performance Framework Specification

> Framework selection and the detailed OKR, MBO and BSC requirements, scoring, calibration, workflow and reporting.

This is a companion document extracted from the comprehensive ScoReview `BUILD.md`. The master `BUILD.md` remains the controlling specification; where interpretation or cross-document dependencies arise, follow the master document and record material decisions as Architecture Decision Records.

## Source context

The ScoReview platform is being extended from its existing OKR capability to support MBO and Balanced Scorecard (BSC), with framework selection at performance-cycle level and one framework per cycle. The implementation must preserve existing OKR behaviour, reuse authoritative Horilla records, and support cloud SaaS and on-premises deployment.

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
