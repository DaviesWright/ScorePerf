# ADR-0001: OKR stays in `pms` and is linked to performance cycles through a mapping table

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Relates to | `BUILD.md` §2.2, §22.2; `BASELINE_ASSESSMENT.md` §2, §7 |

## Context

The existing OKR capability lives in the `pms` app (`Objective`, `KeyResult`, `EmployeeObjective`, `EmployeeKeyResult`, `Comment`, `KeyResultFeedback`), next to 360 feedback, meetings and bonus points. It has no cycle concept: objectives carry their own dates. Its progress behaviour is pinned by `pms/tests/test_progress_calculation.py`. `BUILD.md` requires OKR to remain a protected asset and forbids converting OKR records into MBO or BSC tables.

## Decision

1. OKR stays in the `pms` app. The app label and table names are not changed.
2. A new `PerformanceCycle` (in the new common engine) links to existing OKR records through an explicit **mapping table**. Each mapping row points at an existing `EmployeeObjective` and, where useful, its `Objective`, and records the cycle and assignment.
3. No OKR data is moved, copied, renamed or recalculated. Original identifiers and relationships are preserved.
4. Mapping rows are created only by an explicit action. Legacy OKR records stay unmapped, and no default cycle, target or rating is invented for them.
5. OKR progress is an input to performance conversations. It is never treated as an appraisal score.

## Alternatives considered

- **Rename the app to `okr`:** rewrites table names, high migration risk, little benefit. Rejected.
- **Move OKR data into common tables:** violates `BUILD.md` §22.2 and risks API and report regressions. Rejected.
- **Copy objectives into new models:** creates two sources of truth. Rejected.

## Consequences and risks

- OKR keeps its own domain model and scoring. Cross-framework reporting consumes a common result contract or read model, not OKR tables directly.
- Unmapped legacy objectives appear as "no cycle" in unified reports.
- `pms` stays coupled to feedback and meetings code. That code must not be touched by this work.
- Mapping rows can drift from their source records. Mitigate with foreign keys that protect deletion and a consistency check.

## Migration and compatibility

Additive only: one new table with foreign keys to existing rows. No change to existing tables, API responses or URLs. Rollback is dropping the mapping table.

## Open items

- Names of the new apps and models (see `BASELINE_ASSESSMENT.md` D-2).
- API contract tests for `/api/v1/pms/*` come first (backlog P1-00).
