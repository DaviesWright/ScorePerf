-- ==============================================================================
-- Migration 0037: Potential rating, 9-box inputs and Performance Improvement Plans
--   - Potential: manager proposes LOW / MEDIUM / HIGH with a rationale; the
--     calibration committee confirms it in the decision (audited, appealable)
--   - PIPs follow the five stages already shown in the UI:
--     INITIATION -> ACCEPTANCE -> SIGN_OFF -> EXECUTION -> CLOSURE
--     and are opened by HR only from a certified low rating, never automatically
-- Additive only.
-- ==============================================================================

ALTER TABLE performance_assessments
  ADD COLUMN IF NOT EXISTS potential_proposed TEXT NULL CHECK (potential_proposed IS NULL OR potential_proposed IN ('LOW', 'MEDIUM', 'HIGH')),
  ADD COLUMN IF NOT EXISTS potential_rationale TEXT NULL,
  ADD COLUMN IF NOT EXISTS potential_proposed_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS potential_confirmed TEXT NULL CHECK (potential_confirmed IS NULL OR potential_confirmed IN ('LOW', 'MEDIUM', 'HIGH')),
  ADD COLUMN IF NOT EXISTS potential_confirmed_by TEXT NULL;

ALTER TABLE performance_calibration_decisions
  ADD COLUMN IF NOT EXISTS potential TEXT NULL CHECK (potential IS NULL OR potential IN ('LOW', 'MEDIUM', 'HIGH'));

CREATE TABLE IF NOT EXISTS performance_pips (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  manager_id TEXT NULL,
  cycle_id TEXT NOT NULL,
  trigger_rating NUMERIC(5,2) NOT NULL,
  certified_version INT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'ACCEPTANCE' CHECK (stage IN ('INITIATION', 'ACCEPTANCE', 'SIGN_OFF', 'EXECUTION', 'CLOSURE')),
  improvement_areas_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  support_plan TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  employee_comment TEXT NULL,
  accepted_at TIMESTAMPTZ NULL,
  signed_off_by TEXT NULL,
  signed_off_at TIMESTAMPTZ NULL,
  outcome TEXT NULL CHECK (outcome IS NULL OR outcome IN ('MET', 'PARTIALLY_MET', 'NOT_MET', 'WITHDRAWN')),
  outcome_reason TEXT NULL,
  closed_by TEXT NULL,
  closed_at TIMESTAMPTZ NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_date < end_date)
);

-- One live PIP per employee per cycle.
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_one_live_pip
  ON performance_pips (tenant_id, employee_id, cycle_id)
  WHERE stage <> 'CLOSURE';

CREATE TABLE IF NOT EXISTS performance_pip_checkins (
  id TEXT PRIMARY KEY,
  pip_id TEXT NOT NULL REFERENCES performance_pips(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ON_TRACK', 'AT_RISK', 'OFF_TRACK')),
  notes TEXT NOT NULL,
  evidence TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
