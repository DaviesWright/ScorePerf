# ADR-0013: Audit reuses the existing change history

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Relates to | `BUILD.md` §5.1 `AuditEvent`, §18.1 |

## Context

`BUILD.md` lists an `AuditEvent` entity and a broad list of auditable events. The code base already records field-level history with `HorillaAuditLog` (django-simple-history based) on OKR models, plus `horilla_audit` and django-auditlog.

## Decision

1. **Reuse the existing mechanisms.** No new general-purpose audit table is added.
2. Every new tenant-owned model in the `scoreview_*` apps registers with `HorillaAuditLog` so create, update and delete carry actor, time and before/after values.
3. Events that are not field changes are recorded as **explicit rows in the owning domain tables**, which the model already requires: approvals and delegations (`PerformanceApproval`), calibration outcomes (`CalibrationRecord`), certification and publication (status transitions with actor and timestamp), AI proposals and their human disposition. These rows are the audit record and are immutable once certified.
4. Reads that need auditing under `BUILD.md` §18.1 (sensitive exports, bulk downloads, evidence downloads) are logged through the existing audit facility as discrete events when those features are built.

## Alternatives considered

- **A dedicated `AuditEvent` table (BUILD default):** one place to query, but duplicates what exists and risks two sources of truth. Rejected for now.

## Consequences and risks

- Field history does not capture business meaning by itself; the domain rows in (3) must be complete. Review each workflow for gaps before release.
- History tables grow without bound: define retention (BUILD §18.3).
- A single cross-domain audit view would need a read model built over several tables. Deferred.

## Migration and compatibility

None. Additive per new model.

## Revisit when

A client requires a single immutable audit log (for example for a regulator) that field history and domain rows cannot provide.
