# ADR-0014: OKR API access rule, creation defaults and safe deletes

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes ("Fix OKR API") |
| Changes existing API behaviour | yes, see Compatibility |
| Relates to | `BASELINE_ASSESSMENT.md` F-11, F-12, F-14; `pms/tests/test_okr_api_contract.py`; ADR-0001 |

## Context

The P1-00 contract tests (commit `d1532ab9b`) pinned six quirks of `/api/v1/pms/`:

1. Any signed-in user could read any objective, employee objective, key result, employee key result or comment by id. The list endpoints restricted what a user without the view permission saw; the detail endpoints did not.
2. Records created through the API had no company, so every company could see them.
3. `POST employee-key-result` without its key result was a 500 (with a start date) or created an orphan row (without).
4. The owner of an employee key result could not list it.
5. A failed delete returned the raw database error text.
6. A write by a user without the permission answered 401, not 403.

## Decision

Fix 1 to 5. Leave 6 (it is the API-wide `permission_required` convention shared by hundreds of endpoints).

**Access rule for detail `GET` (and the restricted employee-key-result list).** A user may read a record if they hold the model's view permission, **or** own the record, **or** are the owner's reporting manager, **or** manage the objective. For definitions (`objective`, `key-result`), the owner, assignee or objective manager qualifies. Anyone else gets **403** with the standard DRF body. Implemented in `horilla_api/api_views/pms/access.py`.

**Creation defaults.** A key result or objective created through the API gets the creator's company unless `company_id_write` is supplied. A creator with no employee record leaves it empty (never invented).

**Required relations.** On create, an employee key result requires `employee_objective_id_write` and `key_result_id_write`; a missing one is a 400 naming the field. Updates are unaffected.

**Safe delete.** A record in use answers 400 `{"error": "This record is in use and cannot be deleted."}`; any other failure is logged and answers a generic 400. No database text is returned.

## Alternatives considered

- **404 instead of 403 for refused reads** (hide existence): consistent with some APIs, but ids are sequential and existence is not secret here, and 403 is the standard for a client to handle. Not chosen.
- **Fix at the model layer** (`EmployeeKeyResult.save`): broader blast radius across the web UI. Rejected; the API boundary is where the bug was exposed.
- **Change the 401-for-denied-write convention globally:** out of scope; separate decision.

## Compatibility and risk

- **Behaviour change for clients.** A signed-in user who previously could read someone else's OKR record by id now gets 403. Legitimate flows (employee reads own, manager reads a report's, HR with the permission) still work. **The mobile client should be tested against this.**
- The restricted `employee-key-result` list now returns the owner's own rows (previously empty), a widening that matches the other lists.
- Records created before this change with no company are unchanged; they are not backfilled (that needs a separate, reviewed migration).
- No schema change, no migration. Rollback: revert the commit.

## Tests

`pms/tests/test_okr_api_contract.py`: `AccessRuleTests`, `CreateDefaultsTests`, `RelationValidationTests`, `SafeDeleteTests` replace the former known-quirk tests; 401-on-denied-write stays pinned.

## Not fixed here

- F-13: the lowercase `class meta:` that stops a uniqueness rule applying (needs a data check first).
- The 401-versus-403 convention.
- Existing company-less rows (F-1).
