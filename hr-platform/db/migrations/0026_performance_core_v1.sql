-- ==============================================================================
-- Migration 0026: Canonical Performance Management Core (Phase 1 & Phase 2)
-- Implements Blueprint §8.2, §8.3, §8.5, §8.6 + Locked Decisions D1..D7:
--   - Single framework per cycle + one active cycle per company (D1)
--   - Effective-dated framework profiles & immutable profile versions
--   - BSC perspective label snapshots at cycle open (D7)
--   - Canonical performance_goals, measures, targets, weights, alignment, updates
--   - Immutable score calculation snapshots & append-only status/audit history
--   - Phase 2 assessment, peer/360, calibration, final ratings & appeals tables
-- ==============================================================================

-- 1. Framework Master & Effective-Dated Profiles
CREATE TABLE IF NOT EXISTS performance_framework_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  framework_type TEXT NOT NULL CHECK (framework_type IN ('BSC', 'OKR', 'MBO')),
  name TEXT NOT NULL,
  active_version_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS performance_profile_versions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES performance_framework_profiles(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  scoring_rule TEXT NOT NULL DEFAULT 'RATIO' CHECK (scoring_rule IN ('RATIO', 'GAP_TO_TARGET', 'STAIRCASE', 'BINARY', 'MILESTONE')),
  weight_tolerance NUMERIC(6,4) NOT NULL DEFAULT 0.0100,
  visibility_default TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility_default IN ('PRIVATE', 'TEAM', 'PUBLIC')),
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE NULL,
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, version_number)
);

-- Enforce one active cycle per company on existing performance_cycles if company_id & status exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'performance_cycles' AND column_name = 'status'
  ) THEN
    -- Ensure only the latest cycle per company remains 'active' before adding the unique constraint
    UPDATE performance_cycles pc
    SET status = 'closed'
    WHERE status = 'active'
      AND id <> (
        SELECT id FROM performance_cycles p2
        WHERE COALESCE(p2.company_id, 1) = COALESCE(pc.company_id, 1)
          AND p2.status = 'active'
        ORDER BY id DESC
        LIMIT 1
      );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_cycle_per_company
      ON performance_cycles ((COALESCE(company_id, 1)))
      WHERE status = 'active';
  END IF;
END $$;

-- 2. D7: BSC Perspective Label Snapshots at Cycle Open
CREATE TABLE IF NOT EXISTS performance_cycle_label_snapshots (
  id TEXT PRIMARY KEY,
  cycle_id TEXT NOT NULL,
  perspective_code TEXT NOT NULL CHECK (perspective_code IN ('FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH')),
  perspective_label TEXT NOT NULL,
  display_order INT NOT NULL,
  default_weight_pct NUMERIC(6,2) NOT NULL DEFAULT 25.00,
  snapshotted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, perspective_code)
);

-- 3. Canonical Goal Core
CREATE TABLE IF NOT EXISTS performance_goals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  cycle_id TEXT NOT NULL,
  framework TEXT NOT NULL CHECK (framework IN ('BSC', 'OKR', 'MBO')),
  profile_version_id TEXT NULL REFERENCES performance_profile_versions(id),
  owner_employee_id TEXT NOT NULL,
  org_unit_id TEXT NULL,
  perspective_code TEXT NULL CHECK (perspective_code IN ('FINANCIAL', 'CUSTOMER', 'INTERNAL_PROCESS', 'LEARNING_GROWTH')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  weight_pct NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (weight_pct >= 0 AND weight_pct <= 100),
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE', 'TEAM', 'PUBLIC')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'IN_PROGRESS', 'AT_RISK', 'OFF_TRACK', 'REVISION_REQUESTED', 'COMPLETED', 'CLOSED', 'CANCELLED', 'DEFERRED')),
  confidence_level TEXT NULL CHECK (confidence_level IN ('ON_TRACK', 'AT_RISK', 'OFF_TRACK')),
  confidence_score NUMERIC(5,2) NULL,
  progress_pct NUMERIC(7,4) NOT NULL DEFAULT 0,
  computed_score NUMERIC(7,4) NULL,
  rule_version_pinned TEXT NOT NULL DEFAULT '2026.1',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_perf_goals_cycle_owner
  ON performance_goals (tenant_id, cycle_id, owner_employee_id, framework, status);

CREATE TABLE IF NOT EXISTS performance_goal_measures (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  measure_type TEXT NOT NULL DEFAULT 'NUMERIC' CHECK (measure_type IN ('NUMERIC', 'PERCENTAGE', 'BINARY', 'MILESTONE', 'CUSTOM')),
  scoring_rule TEXT NOT NULL DEFAULT 'RATIO' CHECK (scoring_rule IN ('RATIO', 'GAP_TO_TARGET', 'STAIRCASE', 'BINARY', 'MILESTONE')),
  baseline NUMERIC(12,4) NOT NULL DEFAULT 0,
  target NUMERIC(12,4) NOT NULL DEFAULT 100,
  actual NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  weight_pct NUMERIC(7,4) NOT NULL DEFAULT 100,
  staircase_bands JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_goal_alignment (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  cycle_id TEXT NOT NULL,
  child_goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  parent_goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  is_skip_level BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PROPOSED', 'ACTIVE', 'RETIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  CHECK (child_goal_id <> parent_goal_id),
  UNIQUE (child_goal_id, parent_goal_id)
);

CREATE INDEX IF NOT EXISTS idx_perf_alignment_parent
  ON performance_goal_alignment (tenant_id, parent_goal_id);

CREATE TABLE IF NOT EXISTS performance_goal_updates (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  actor_employee_id TEXT NOT NULL,
  progress_pct NUMERIC(7,4) NOT NULL,
  confidence_level TEXT NULL CHECK (confidence_level IN ('ON_TRACK', 'AT_RISK', 'OFF_TRACK')),
  notes TEXT NOT NULL DEFAULT '',
  blockers TEXT NULL,
  next_steps TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_goal_status_history (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  actor_employee_id TEXT NOT NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_score_snapshots (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  cycle_id TEXT NOT NULL,
  framework TEXT NOT NULL,
  profile_version_id TEXT NULL,
  rule_version TEXT NOT NULL,
  normalized_score NUMERIC(7,4) NOT NULL,
  percentage_score NUMERIC(7,2) NOT NULL,
  five_point_score NUMERIC(5,2) NOT NULL,
  inputs_json JSONB NOT NULL,
  computed_by TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Phase 2 Assessment, Calibration & Appeals Tables (§8.3)
CREATE TABLE IF NOT EXISTS performance_assessments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  cycle_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  manager_employee_id TEXT NULL,
  stage TEXT NOT NULL DEFAULT 'SELF_PENDING',
  self_rating NUMERIC(5,2) NULL,
  manager_rating NUMERIC(5,2) NULL,
  calibrated_rating NUMERIC(5,2) NULL,
  final_rating NUMERIC(5,2) NULL,
  rating_band TEXT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, cycle_id, employee_id)
);

CREATE TABLE IF NOT EXISTS performance_calibration_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  cycle_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'OPEN', 'COMPLETED')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_calibration_decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES performance_calibration_sessions(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
  pre_rating NUMERIC(5,2) NOT NULL,
  post_rating NUMERIC(5,2) NOT NULL,
  rationale TEXT NOT NULL,
  approver_employee_id TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_appeals (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'FILED' CHECK (status IN ('FILED', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED')),
  resolution_notes TEXT NULL,
  decided_by TEXT NULL,
  filed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

-- 5. Append-only Performance Audit Log (§8.6)
CREATE TABLE IF NOT EXISTS performance_audit_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  actor_employee_id TEXT NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('ESS', 'MSS', 'HRMS')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
