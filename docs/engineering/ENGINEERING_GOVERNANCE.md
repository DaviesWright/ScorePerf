# ScoReview — Engineering Governance

> Evidence and documents, UX, APIs, AI governance, audit/privacy, quality engineering, ADRs and developer execution rules.

This is a companion document extracted from the comprehensive ScoReview `BUILD.md`. The master `BUILD.md` remains the controlling specification; where interpretation or cross-document dependencies arise, follow the master document and record material decisions as Architecture Decision Records.

## Source context

The ScoReview platform is being extended from its existing OKR capability to support MBO and Balanced Scorecard (BSC), with framework selection at performance-cycle level and one framework per cycle. The implementation must preserve existing OKR behaviour, reuse authoritative Horilla records, and support cloud SaaS and on-premises deployment.

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
