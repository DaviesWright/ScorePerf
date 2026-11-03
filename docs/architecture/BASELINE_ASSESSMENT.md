# ScoReview Performance: Baseline Assessment (Phase 0)

**Status:** Draft for product and engineering approval. This is the Phase 0 exit-gate document required by `BUILD.md` §3 and §23. **No application code, migration or schema has been changed for the build.**

| | |
|---|---|
| Date | 2026-11-03 |
| Branch / commit | `main-custom` @ `1a7087ee0` (1 commit ahead of `origin/main-custom`) |
| Working tree at start | Clean except the untracked `BUILD.md` |
| Method | Read-only inspection of code, live Django configuration, a local dev database, and test runs |
| Reproduce | See §11 |

Items marked **PENDING** are still running or need data this environment does not have. Items marked **HYPOTHESIS** come from static analysis and are not confirmed defects.

---

## 1. Repository inventory (BUILD §3.1)

| Area | Finding |
|---|---|
| Python / Django | Python 3.12.10, Django 5.2.18 (LTS). Upstream supports 3.12 to 3.14. |
| Size | About 378k lines of Python in 1,498 files, 54 installed apps, 28 middleware classes, 252 migrations, 2,135 templates, 262 test files. |
| First-party apps relevant to this build | `pms` (current OKR, 360 feedback, meetings, bonus points), `base` (Company, Department, JobPosition), `employee`, `horilla_auth`, `horilla_audit`, `horilla_api`, `report`, `horilla_theme`, `scoreview_performance` (our customisations). |
| Hidden modules (ours) | `payroll`, `recruitment`, `onboarding`, `offboarding`: installed, URLs 404, sidebar entries removed. See `CUSTOMIZATIONS.md`. |
| Routing | 33 top-level prefixes. Web OKR under `/pms/`. REST under `/api/v1/`: 343 routes, 49 of them `pms`. Snapshot: `docs/architecture/baseline/api_routes.txt`. |
| API stack | DRF with `TenantScopedJWTAuthentication`, default `IsAuthenticated`, throttling classes, drf-yasg docs. |
| Auth backends | `AxesStandaloneBackend` then `CompanyScopedBackend` (per-company group permissions; `COMPANY_SCOPED_PERMISSIONS=True` by default). |
| Middleware of note | `RequestIDMiddleware`, `CompanyMiddleware`, `ForcePasswordChangeMiddleware`, `TwoFactorAuthMiddleware`, `AuditlogMiddleware`, `AxesMiddleware`, `Fail2BanMiddleware`, plus our `HideModulesMiddleware`. |
| Database / cache | Local dev: SQLite and in-process cache. Production profile: PostgreSQL and Redis. |
| Storage | Default `FileSystemStorage`; S3 and GCS optional through `django-storages`. |
| Background jobs | APScheduler via `django-apscheduler`, one dedicated `run_scheduler` process. **No task queue (no Celery or equivalent) is installed.** |
| Frontend | Django templates, HTMX, `_hyperscript`, Alpine, jQuery. Tailwind runs in the browser (`tailwindcdn.js`). Chart.js is loaded from the jsdelivr CDN by dashboard pages. No build step. |
| Containers | Multi-stage `Dockerfile` on `python:3.12-slim`, non-root user. Compose services: `web`, `scheduler`, `db` (Postgres 16), `redis`, `nginx`. **The `web` entrypoint runs `migrate` and `collectstatic` at start-up** unless `HORILLA_SKIP_RELEASE_TASKS=1` (BUILD §12.6 wants migrations as a controlled deploy step). |
| CI | `.github/workflows`: `unit-tests`, `quality`, `codeql`, `docker-ci`, `docker-publish`. Tooling: ruff, pre-commit, gitleaks, coverage. |
| Migrations | All applied locally (0 unapplied). `pms` has 7 migrations. `makemigrations --check` reports no pending changes. |
| Known technical debt | `pdfkit==1.0.0` has an unpatched advisory (alert dismissed with documented mitigation, see `CUSTOMIZATIONS.md`). Tailwind and Chart.js from CDN. Weak test coverage on `pms` (18 test functions in 3 files). |

---

## 2. Existing OKR assessment (BUILD §3.2)

### 2.1 Where OKR lives

The `pms` app mixes four capabilities. Only the first is OKR.

| Capability | Models |
|---|---|
| **OKR** | `Objective`, `KeyResult`, `EmployeeObjective`, `EmployeeKeyResult`, `Comment`, `KeyResultFeedback` |
| 360 feedback | `Feedback`, `AnonymousFeedback`, `Question*`, `Answer`, `Period` (used as the feedback "cycle period") |
| Meetings | `Meetings`, `MeetingsAnswer` |
| Bonus points | `EmployeeBonusPoint`, `BonusPointSetting` |

`Period` is **not** an OKR cycle. Objectives carry their own dates and have no link to a cycle.

### 2.2 Current OKR model

```text
Objective (template-like: title, managers M2M, assignees M2M, key_result_id M2M,
           duration + unit, company FK nullable, is_template, archive)
   └── EmployeeObjective (one per employee x objective; unique_together)
         fields: start/end date, status, progress_percentage (int), archive
         └── EmployeeKeyResult (current/start/target as IntegerField, status,
                                progress_percentage int, progress_type, dates)
KeyResult (reusable definition: title, progress_type, target_value, company FK nullable)
```

### 2.3 Answers to the BUILD §3.2 discovery questions

| Area | Finding |
|---|---|
| Models | As above. Numeric values are `IntegerField`, not `Decimal`. |
| Ownership | An `EmployeeObjective` belongs to one employee. `Objective.managers` and `assignees` are employee M2Ms. No team, department or company-level objectives. |
| Alignment | **None.** No parent/child objective relationship exists. |
| Progress | `EmployeeKeyResult.update_kr_progress`: `current / target * 100`, stored as int (truncated). Uncapped (can exceed 100). Target 0 leaves progress unchanged. `start_value` is ignored. Objective progress is the integer mean of key-result progress, each capped at 100. |
| Check-ins | `current_value` updates through `key_result_current_value_update`, clamped to `>= 0`. History through `HorillaAuditLog` (simple_history based) on objective and key-result models. No separate check-in entity, no confidence field. |
| Scoring | Progress only. **No rating, weight, band or formula configuration.** |
| Workflow | Status choice only (`Not Started`, `On Track`, `Behind`, `At Risk`, `Closed`). **No approval, agreement or locking.** |
| Permissions | Mixed: `login_required` plus `permission_required`, manager/owner decorators, and inline checks. See §4. |
| APIs | 49 `pms` routes under `/api/v1/pms/` (period, key-result, objective, employee-objective, employee-key-result, comment, feedback, questions, meetings...). Mobile clients may depend on them. |
| Reports | `pms/dashboard.py` KPIs; the `report` app may read OKR fields. **Dependency list not yet produced (PENDING).** |
| Data | **Local dev database has zero rows in every `pms` table.** Legacy and inconsistent values cannot be assessed here. A production-like copy is required. |

### 2.4 OKR behaviour and compatibility matrix

Current behaviour is pinned by `pms/tests/test_progress_calculation.py` (10 characterization tests). Those tests are the seed of the protected OKR regression suite.

| Behaviour | Pinned by test | Dependents | Proposed change |
|---|---|---|---|
| KR progress is `int(current/target*100)`, truncated | yes | dashboards, API, templates | **None.** Preserve. |
| `start_value` does not affect progress | yes | none known | None. Flag as a product question (§10). |
| Progress can exceed 100 per KR | yes | objective mean caps it | None. |
| Zero target leaves progress untouched | yes | none | None. |
| Objective progress = int mean of capped KR progress | yes | dashboards, API | None. |
| No KRs gives objective progress 0 | yes | dashboards | None. |
| End date derived from objective duration on create | yes | forms | None. |
| `unique_together (employee, objective)` | partly | assignment flow | None. |
| Status vocabulary (5 values) | not by test | UI, API, filters | None. Map to the common status contract, do not rename. |
| API contracts (`/api/v1/pms/*`) | no contract tests | mobile | None. Add contract tests before touching. |

Rule for the build (BUILD §1.1, §2.2): OKR achievement is an input to performance conversations, not an appraisal score. The OKR domain is not migrated into MBO or BSC tables (BUILD §22.2).

---

## 3. Horilla integration map (BUILD §3.3)

Reuse these. Do not create parallel master records.

| Concept | Authoritative model | Notes |
|---|---|---|
| Company / tenant | `base.Company` | `Company.hq` marks the HQ. A user may be assigned several companies through `base.CompanyGroupAssignment`. |
| Employee | `employee.Employee` | `employee_user_id` one-to-one to `horilla_auth.HorillaUser` (`AUTH_USER_MODEL`); `is_active`; `badge_id`. |
| Work details | `employee.EmployeeWorkInformation` | One-to-one with Employee. Holds `company_id`, `department_id`, `job_position_id`, `reporting_manager_id`, `employee_type_id`, `date_joining`, `contract_end_date`. **An employee's company is read from here**, not from `Employee`. |
| Department | `base.Department` | Flat. No parent/child hierarchy model was found. |
| Job position / role | `base.JobPosition`, `base.JobRole` | |
| Reporting line | `EmployeeWorkInformation.reporting_manager_id` | Single manager per employee. The organisation hierarchy is derived from this, not stored as a tree. |
| Permissions | `CompanyScopedBackend`, per-company group assignment, Django permissions | |
| Audit | `horilla_audit`, `HorillaAuditLog` (simple_history), django-auditlog | An `AuditEvent` entity (BUILD §5.1) does not exist as such; decide whether to reuse or add (§10). |
| Notifications | `notifications` app (in-app), email backend `ConfiguredEmailBackend` | |
| Base model | `horilla.models.HorillaModel` | Provides created/updated metadata and the history mixin. |

---

## 4. Tenancy and security review (BUILD §11)

Tenant isolation in this code base rests on a convenience filter, not a hard boundary. BUILD §11.1 requires it to be a security boundary.

| ID | Finding | Evidence | Severity |
|---|---|---|---|
| F-1 | `HorillaCompanyManager` **includes rows whose company is NULL for every company** (`Q(path=company) \| Q(path__isnull=True)`). `Objective.company_id`, `KeyResult.company_id` and `Period.company_id` are nullable, so such rows are visible to all tenants. | `base/horilla_company_manager.py` | High for any new tenant-owned model that copies this pattern |
| F-2 | Scoping relies on a request-bound ContextVar. **With no company context (scheduler, shell, unauthenticated paths) the manager adds no predicate**, so background jobs see all tenants. | same file; also documented in `horilla_api/authentication.py` | High for BUILD §11.1 "background task tenant context" |
| F-3 | The manager default can be bypassed by `_base_manager`, `entire()` or raw SQL. Upstream's own docstring says per-viewset `get_queryset` filtering is still needed. | `horilla_api/authentication.py` | Medium |
| F-4 | Superusers and the session "all" company mode are unscoped by design. | manager and middleware | Accept, document |
| F-5 | `EmployeeKeyResult` and `Comment` scope through a parent path (`...__company_id`), not a direct company column. No database constraint prevents cross-company relationships. | `pms/models.py` | Medium |
| F-6 | **HYPOTHESIS:** 4 `pms` function views lack `@login_required` (`obj_form_save`, `objective_filter_pagination`, `send_feedback_notifications`, `filtersubordinates`); some may be internal helpers not routed. 13 id-fetching views have no permission decorator. Two were read (`update_employee_objective`, `key_result_current_value_update`) and both check owner, manager or permission **inline**, so the pattern is inconsistent, not necessarily open. | static scan of `pms/views.py` | To verify |
| F-7 | `ast.literal_eval` is used to parse posted values (safe). No raw `eval` in `pms`. | `base/methods.py` | OK |
| F-8 | API: 2 of 343 routes declare no explicit `permission_classes` (default `IsAuthenticated` still applies). | route snapshot | Low |
| F-9 | `pdfkit` advisory (unpatched). Mitigated by the XSS guard in `generate_pdf`; BUILD §14.2 wants a planned replacement. | `CUSTOMIZATIONS.md` | Medium |
| F-10 | Web container runs `migrate` at start-up. | `docker/entrypoint.sh` | Medium (BUILD §12.6) |

---

## 5. Baseline evidence (BUILD §3.4)

| Check | Result |
|---|---|
| Django system check | Pass, 0 issues |
| Pending model changes | None |
| Unapplied migrations | 0 |
| Ruff (`ruff check .`, repo config, ruff 0.17.3) | **All checks passed** |
| Targeted tests (`report`, PDF XSS guard, health version) | 99 run, 98 pass, **1 error**: `report.tests.test_report_execution.PdfFontEmbeddingTests.test_pdf_embeds_a_truetype_font`, a Windows `PermissionError` opening a temporary `.ttf` inside the PDF library. **Pre-existing: it fails identically on commit `148cbfd34`, before the rebrand (confirmed 2026-11-03).** Classified as an environment issue (Windows temp files). |
| Full test suite | **PENDING** (running). Failures will be classified here as pre-existing or new. |
| `pms` tests | 18 test functions in 3 files (`test_progress_calculation` 10, `test_dashboard_kpi` 7, `test_check_duplication` 1). Result is part of the full run. |
| API schema snapshot | `generate_swagger` cannot run (drf-yasg `DEFAULT_INFO` missing). Substituted a route snapshot from the URL resolver: 343 routes. |
| Web smoke test (local) | Login 200; a 61-page admin crawl had no server errors. Hidden-module URLs return 404. |
| OKR critical-path screenshots | **Not captured.** Requires a signed-in session and OKR data; the dev database has none. |
| Deployment smoke test | **Not run.** Docker 29.9.2 is installed; building and starting the Compose stack is a Phase 5 activity and was not attempted. |

---

## 6. Gap analysis against BUILD §5

| BUILD entity or capability | Exists today? |
|---|---|
| `PerformanceCycle`, lifecycle states | **No.** Only `Period` (360 feedback). |
| `FrameworkType`, configuration, versions | No |
| `PerformanceAssignment` | Partly: `EmployeeObjective` is an OKR-specific assignment |
| KPI catalogue, versioned definitions | No (`KeyResult` is a reusable OKR definition only) |
| `PerformanceTarget` with change control | No |
| `PerformanceEvidence` | No (text comments only) |
| Assessment, scores, rating scales | No |
| Approval workflow, calibration | No |
| Audit trail | Partial (field history via simple_history) |
| MBO, BSC | No |
| Task queue for long jobs | No (APScheduler only) |
| `Decimal` precision for scores | No (`IntegerField` in OKR) |
| Tenant constraints in the database | No |

---

## 7. Proposed domain mapping (for approval, nothing built)

```mermaid
flowchart TD
  Company[base.Company] --> Cycle[PerformanceCycle]
  Cycle --> FW[FrameworkConfiguration + FrameworkVersion]
  Cycle --> Assign[PerformanceAssignment]
  Employee[employee.Employee] --> Assign
  Assign --> OKRLink[OKRCycleLink: maps existing pms.EmployeeObjective]
  Assign --> MBO[mbo.*]
  Assign --> BSC[bsc.*]
  OKRLink -. preserves .-> EO[pms.EmployeeObjective]
  MBO --> Result[common result contract]
  BSC --> Result
  EO --> Result
  Result --> Eval[performance_evaluation: assessment, calibration, certification]
```

Proposals, each needing an ADR before implementation (BUILD §26):

1. **Keep OKR in `pms`** for now and expose it as the OKR domain through a thin service layer and mapping model. Renaming the app label to `okr` rewrites table names and is a high-risk migration with little benefit.
2. **Link, do not move:** a controlled `OKRCycleLink` (or similar) ties an existing `EmployeeObjective` to a new cycle without altering its identity (BUILD §22.2).
3. **First vertical slice (Phase 1):** `PerformanceCycle` + `FrameworkType/Configuration/Version` + state machine, behind a feature flag, with OKR unchanged.
4. **Tenant safety for new models:** a **non-nullable company on every new tenant-owned table**, explicit service-layer scoping, and a database check that child rows share their parent's company. Do **not** copy the NULL-means-global behaviour (F-1).
5. **Decimal fields** for targets, weights and scores in all new models.

---

## 8. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Cross-tenant leakage through the company manager (F-1 to F-3) | Medium | High | New-model rules in §7.4; tenant tests for every endpoint; evaluate Postgres RLS later as defence in depth (BUILD §11.1) |
| R-2 | Regression of OKR behaviour | Medium | High | Treat `test_progress_calculation.py` as protected; add API contract tests first |
| R-3 | No production OKR data to test migrations against | High | Medium | Obtain a protected production-like copy before any schema work |
| R-4 | Mobile clients depend on `/api/v1/pms/` | Medium | High | Contract tests; version any breaking change |
| R-5 | No task queue for PDF, imports, recalculation | Certain | Medium | ADR 7: introduce Celery with Redis for Phase 1 or 2 |
| R-6 | `pdfkit` advisory, wkhtmltopdf binary | Certain | Medium | ADR 10: replacement plan |
| R-7 | Migrations run in every web container at start-up | Certain | Medium | Make release tasks a separate step (ADR 6) |
| R-8 | Upstream `pms` has thin tests | Certain | Medium | Add characterization tests before refactors |
| R-9 | Scope creep from the 360 feedback and meetings living in `pms` | Medium | Medium | Keep OKR boundary explicit; do not touch feedback code |
| R-10 | SQLite lock errors in local multi-process use (seen once with the scheduler) | Certain locally | Low | Use PostgreSQL for any multi-process run |

---

## 9. Prioritised backlog (indicative, to be confirmed after approval)

| Order | Ticket | Scope | Depends on |
|---|---|---|---|
| 1 | P1-00 | OKR contract tests: pin API responses for `/api/v1/pms/*` and key web flows | none |
| 2 | P1-01 | ADR set 1 to 5 and 10 (monolith, framework per cycle, KPI catalogue, scoring contract, tenancy, PDF) | approval |
| 3 | P1-02 | `performance_core`: `PerformanceCycle`, `FrameworkType`, configuration, versions, state machine, feature flag | P1-01 |
| 4 | P1-03 | `PerformanceAssignment` and OKR link mapping, no data moved | P1-02 |
| 5 | P1-04 | Tenant-scoping base manager and cross-tenant test kit for new models | P1-01 |
| 6 | P1-05 | KPI catalogue with versioning | P1-02 |
| 7 | P1-06 | Targets and change control; evidence metadata | P1-05 |
| 8 | P1-07 | Audit events and permission set | P1-02 |
| 9 | P1-08 | Release tasks out of the web entrypoint; Celery decision and spike | ADR 6, 7 |
| later | Phase 2 and 3 | MBO and BSC vertical slices | Phase 1 gate |

---

## 10. Decisions and questions needed before structural work

1. **Approve §7** (keep OKR in `pms`, link by mapping, first slice scope), or direct an alternative.
2. **Production-like OKR data:** can a protected copy be provided for migration testing (R-3)?
3. **Product questions on OKR semantics:** should `start_value` ever affect progress? Should progress remain uncapped per key result? Both are pinned today and will stay unless you decide otherwise.
4. **Tenancy:** confirm the "non-nullable company on all new tables" rule (§7.4) and that superuser unscoped access is acceptable for the new modules.
5. **Production database:** BUILD requires PostgreSQL for multi-process use. Confirm it is the production target so database constraints can be relied on.
6. **Task queue:** approve introducing Celery with Redis (ADR 7).
7. **Deployment target:** the Cloudflare question is still open and feeds ADR 6.
8. **Audit model:** reuse `HorillaAuditLog` and `horilla_audit`, or add a dedicated business audit event table (BUILD §18)?
9. **Hidden modules:** confirm `payroll`, `recruitment`, `onboarding`, `offboarding` stay hidden (BUILD §28 excludes them).

---

## 10a. Reconciliation of BUILD.md, CUSTOMIZATIONS.md and README.md

| # | Finding | Proposed resolution |
|---|---|---|
| D-1 | **`README.md` is still the upstream HRMS README** with only the word replaced ("ScoReview HRMS"). Its Quick Start tells readers to `docker pull horilla/horilla-hr:2.2.1` and `git clone https://github.com/horilla/horilla-hr.git`, so following it installs **stock Horilla, not ScoReview**. It also advertises Payroll, Recruitment and Onboarding (hidden here), upstream badges, upstream branch advice and Discussion #1127. | Rewrite the README for ScoReview Performance: product description per `BUILD.md`, our setup and deployment, attribution to Horilla (LGPL-2.1). Needs your go-ahead; not done yet. |
| D-2 | **App naming.** `CUSTOMIZATIONS.md` fixes the app name `scoreview_performance` and the slug `scoreview-performance`. `BUILD.md` §4.1 proposes `performance_core`, `performance_catalog`, `mbo`, `bsc`, `performance_evaluation` and so on. | Decide in an ADR: either prefix the new apps (for example `scoreview_core`, `scoreview_mbo`, `scoreview_bsc`) or amend the naming rule. Add the choice to the Phase 1 ADR set. |
| D-3 | **`okr/` does not exist.** `BUILD.md` §4.1 lists `okr/` as "existing". The existing OKR code is the `pms` app (§2.1). | Keep `pms` as the OKR domain for now (§7 proposal 1). |
| D-4 | **Frontend rules vs reality.** `BUILD.md` §15.4 requires compiled Tailwind and pinned local Chart.js. Today Tailwind runs in the browser and Chart.js comes from a CDN, and our `colors.js` wraps the global `Chart`. | Follow `BUILD.md`. `colors.js` keeps working once Chart.js is vendored, because it hooks `window.Chart`. Add the frontend build as a Phase 1 or 5 ticket. |
| D-5 | **Theme compatibility.** `BUILD.md` §15.4 wants branding compatible with `HorillaColorTheme` and its migrations. | Already satisfied: the ScoReview theme is a data migration on that model. |
| D-6 | **Environment names.** `CUSTOMIZATIONS.md` plans a `SCOREVIEW_` prefix; the code still uses `HORILLA_*`. `BUILD.md` §12.4 asks for a documented `.env.example`; the repo ships `.env.dist`. | Keep `HORILLA_*` until the Layer 2 rename is approved. Rename `.env.dist` or add `.env.example` when that work happens. |
| D-7 | **Scope consistency.** `CUSTOMIZATIONS.md` lists Leave, Attendance (with biometric) and Reports as active modules; `BUILD.md` §28 excludes payroll, recruitment and a full HRMS replacement. These are consistent: the build extends performance management and reuses the HRIS entities. Hidden modules match §28. | None. |
| D-8 | **`BUILD.md` is untracked** although it says it is the master directive, and a blanket rebrand run would rewrite its references to Horilla. | Commit it, and keep `BUILD.md` and `docs/` out of any future blanket replacement (the rebrand script's skip list does not cover them). |
| D-9 | `CUSTOMIZATIONS.md` says upstream is not tracked; `BUILD.md` §3.3 says reuse Horilla entities. Compatible, but any upstream fix (for example the open `pdfkit` issue) must be backported by hand. | Record in the maintenance process (`docs/engineering/RELEASE_PROCESS.md`, later). |

---

## 11. Reproduction commands

```bash
git rev-parse --short HEAD && git status --short
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py showmigrations | grep -c "^ \[ \]"
python -m ruff check .
python manage.py test pms --noinput                       # OKR domain tests
python manage.py test --noinput                           # full suite (long)
python manage.py test report base.tests.test_pdf_xss_guard horilla_api.tests.test_health_version
```

Route snapshot: regenerate with a short script that walks `django.urls.get_resolver()` for `api/v1/` (see `docs/architecture/baseline/api_routes.txt`).
