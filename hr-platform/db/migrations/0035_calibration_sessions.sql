-- ==============================================================================
-- Migration 0035: Calibration sessions as a controlled workflow (BUILD.md §9.5, §9.6)
--   - Named committee per session
--   - Explicit list of assessments under calibration in each session
--   - Decisions keep computed, manager, pre and post ratings side by side,
--     plus optional dissent; originals are never overwritten
-- Additive only.
-- ==============================================================================

ALTER TABLE performance_calibration_sessions
  ADD COLUMN IF NOT EXISTS closed_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS policy_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_perf_calibration_sessions_cycle
  ON performance_calibration_sessions (tenant_id, cycle_id, status);

CREATE TABLE IF NOT EXISTS performance_calibration_members (
  session_id TEXT NOT NULL REFERENCES performance_calibration_sessions(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (member_role IN ('CHAIR', 'MEMBER')),
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, employee_id)
);

CREATE TABLE IF NOT EXISTS performance_calibration_items (
  session_id TEXT NOT NULL REFERENCES performance_calibration_sessions(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
  added_by TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_calibration_items_assessment
  ON performance_calibration_items (assessment_id);

ALTER TABLE performance_calibration_decisions
  ADD COLUMN IF NOT EXISTS computed_rating NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS manager_rating NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS dissent_notes TEXT NULL;
