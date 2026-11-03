# ADR-0011: New Django apps use the `scoreview_` prefix

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Replaces | the `performance_core`, `mbo`, `bsc` names proposed in `BUILD.md` §4.1 |
| Relates to | `CUSTOMIZATIONS.md` naming conventions; ADR-0001 |

## Context

`CUSTOMIZATIONS.md` fixes the brand, the app name `scoreview_performance` and the environment prefix `SCOREVIEW_`. `BUILD.md` §4.1 proposed unprefixed names, which would collide in style with upstream apps and hide ownership.

## Decision

Every new first-party app uses the `scoreview_` prefix. Mapping from `BUILD.md` §4.1:

| BUILD.md name | Django app |
|---|---|
| `horilla/` host application | unchanged (not renamed) |
| `performance_core` | `scoreview_core` |
| `performance_catalog` | `scoreview_catalog` |
| `okr` | **stays `pms`** (ADR-0001) |
| `mbo` | `scoreview_mbo` |
| `bsc` | `scoreview_bsc` |
| `performance_evaluation` | `scoreview_evaluation` |
| `performance_workflow` | `scoreview_workflow` |
| `performance_evidence` | `scoreview_evidence` |
| `performance_analytics` | `scoreview_analytics` |
| `performance_ai` | `scoreview_ai` |
| `performance_integrations` | `scoreview_integrations` |

`scoreview_performance` keeps its current role: branding, overrides and hidden-module wiring. Apps are created only when work needs them; this table is a naming rule, not a mandate to create empty apps.

## Consequences

- Update the `CUSTOMIZATIONS.md` naming table (done with this ADR).
- Model names inside an app need no prefix. Database table names will carry the app label, for example `scoreview_core_performancecycle`.
- Environment variables for new settings use `SCOREVIEW_`.

## Migration and compatibility

None. No app has been created yet.
