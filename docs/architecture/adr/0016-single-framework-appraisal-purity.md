# ADR-0016: Single Framework Purity and Anti-Mixing Governance for Performance Appraisals (OKR, MBO, BSC)

| | |
|---|---|
| Status | **Accepted** |
| Date | 2026-11-03 |
| Approver | paa.barnes |
| Relates to | `BUILD.md` §1, §6, §7, §8; ADR-0001, ADR-0012, ADR-0015 |

## Context

Performance Management within ScoReview / ScoRePerf supports three enterprise methodologies:
1. **OKR** (Objectives and Key Results): Quarterly, outcome-driven agile goal management with stretch objectives, measurable key results (0.0 to 1.0 or percentage progress), and confidence scoring.
2. **MBO** (Management by Objectives): Cascading management objectives with assigned percentage weights (summing to 100%), SMART milestones, and formal manager/self rating rubrics.
3. **BSC** (Balanced Scorecard): Strategic multi-perspective corporate performance across four distinct perspectives (*Financial*, *Customer*, *Internal Business Processes*, *Learning & Growth*), with perspective and measure weights summing to 100%.

In complex enterprise environments, ambiguity arises when organizations attempt to mix methodologies inside a single appraisal (e.g. attempting to score an OKR using BSC perspectives, or mixing weighted MBO bonus targets with unweighted OKR stretch goals). This corrupts score normalization, invalidates calibration distributions, and generates confusing employee feedback.

## Decision

1. **Explicit Framework Selection at Cycle Initialization**:
   - Every performance cycle must explicitly select exactly **one** framework (`'OKR'`, `'MBO'`, or `'BSC'`).
   - The choice is mandatory during cycle setup (`POST /api/v1/cycles`).
2. **Framework Immutability Once Selected**:
   - Once a performance appraisal cycle is created, its selected framework is permanently locked.
   - Any attempt to update, alter, or mutate `framework_type_id` or `framework_code` via API (`PATCH /api/v1/cycles/:id`) or directly in the database is rejected by both application validation and PostgreSQL trigger (`trg_cycle_framework_immutable`).
3. **Strict Framework Purity per Appraisal (No Mixing Allowed)**:
   - All employee appraisals, reviews, objective definitions, and evaluations within a cycle must strictly adhere to that cycle's chosen framework.
   - A mix of frameworks cannot be used for any single appraisal:
     - An **OKR** appraisal cannot contain MBO percentage weights or BSC perspective groupings.
     - An **MBO** appraisal cannot contain OKR key results or BSC perspective groupings.
     - A **BSC** appraisal cannot contain OKR stretch key results.
   - The API gateway (`POST /api/v1/appraisals`) validates incoming appraisal payloads against the cycle's framework and returns HTTP `422 Unprocessable Entity` if conflicting framework components are detected.
4. **Multi-Cycle Flexibility**:
   - An organization (such as *Senrab ConsulTech*) is free to operate different frameworks across separate cycles (e.g., an OKR cycle for Engineering, an MBO cycle for Executive Leadership, and a BSC cycle for Enterprise Corporate Strategy).
   - Within each specific cycle, 100% methodology purity is strictly enforced.

## Consequences

- **Integrity**: Calibration, score aggregation, and review workflows remain mathematically sound and methodologically consistent.
- **Clarity**: Employees and managers have unambiguous appraisal criteria aligned with the selected framework.
- **Security & Compliance**: Database-level triggers and API Zod schemas ensure no corrupted or mixed-methodology data enters the system.

