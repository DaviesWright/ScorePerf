-- ==============================================================================
-- Migration 0034: MBO scoring adapter inputs & computed assessment rating
-- Implements BUILD.md §7.4 (MBO measurement and scoring) and §9.5 (keep the
-- calculated result separate from manager and calibrated ratings).
-- Additive only: new nullable columns, no data rewritten.
-- ==============================================================================

-- 1. MBO measure inputs. Direction is declared per measure, never inferred.
ALTER TABLE performance_goal_measures
  ADD COLUMN IF NOT EXISTS direction TEXT NULL
    CHECK (direction IN ('HIGHER_IS_BETTER', 'LOWER_IS_BETTER', 'WITHIN_RANGE', 'EXACT', 'MILESTONE', 'QUALITATIVE')),
  ADD COLUMN IF NOT EXISTS range_min NUMERIC(12,4) NULL,
  ADD COLUMN IF NOT EXISTS range_max NUMERIC(12,4) NULL,
  ADD COLUMN IF NOT EXISTS tolerance_pct NUMERIC(7,4) NULL CHECK (tolerance_pct IS NULL OR tolerance_pct >= 0),
  ADD COLUMN IF NOT EXISTS total_milestones INT NULL CHECK (total_milestones IS NULL OR total_milestones > 0),
  ADD COLUMN IF NOT EXISTS completed_milestones INT NULL CHECK (completed_milestones IS NULL OR completed_milestones >= 0),
  ADD COLUMN IF NOT EXISTS qualitative_rating INT NULL CHECK (qualitative_rating IS NULL OR qualitative_rating BETWEEN 1 AND 5),
  -- `actual` defaults to 0, so a recorded zero and "never recorded" look the same.
  -- MBO scoring treats the actual as missing until this is set by a check-in.
  ADD COLUMN IF NOT EXISTS actual_recorded_at TIMESTAMPTZ NULL;

-- 2. Computed (system) rating, stored beside self / manager / calibrated / final ratings.
ALTER TABLE performance_assessments
  ADD COLUMN IF NOT EXISTS computed_rating NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS computed_achievement_pct NUMERIC(7,2) NULL,
  ADD COLUMN IF NOT EXISTS computed_rule_version TEXT NULL,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS manager_divergence_reason TEXT NULL;

-- 3. Immutable history of every assessment-level computation (reproducibility, §9.4).
CREATE TABLE IF NOT EXISTS performance_assessment_computations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
  framework TEXT NOT NULL CHECK (framework IN ('BSC', 'OKR', 'MBO')),
  rule_version TEXT NOT NULL,
  completeness TEXT NOT NULL CHECK (completeness IN ('COMPLETE', 'INCOMPLETE')),
  achievement_pct NUMERIC(7,2) NULL,
  computed_rating NUMERIC(5,2) NULL,
  inputs_json JSONB NOT NULL,
  result_json JSONB NOT NULL,
  computed_by TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_assessment_computations
  ON performance_assessment_computations (tenant_id, assessment_id, computed_at DESC);
