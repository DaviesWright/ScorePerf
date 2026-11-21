-- ==============================================================================
-- Migration 0036: Certification of calibrated results and employee appeals
--   - Versioned certified results: an appeal amendment adds a version, never edits one
--   - Appeal window, assigned independent reviewer and outcome on appeals
-- Additive only.
-- ==============================================================================

ALTER TABLE performance_calibration_sessions
  ADD COLUMN IF NOT EXISTS certified_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ NULL;

ALTER TABLE performance_assessments
  ADD COLUMN IF NOT EXISTS certified_version INT NULL,
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS appeal_deadline DATE NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS performance_certified_results (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL REFERENCES performance_assessments(id) ON DELETE CASCADE,
  version INT NOT NULL CHECK (version >= 1),
  final_rating NUMERIC(5,2) NOT NULL CHECK (final_rating BETWEEN 1 AND 5),
  computed_rating NUMERIC(5,2) NULL,
  manager_rating NUMERIC(5,2) NULL,
  calibrated_rating NUMERIC(5,2) NULL,
  source TEXT NOT NULL CHECK (source IN ('CALIBRATION', 'APPEAL')),
  source_id TEXT NOT NULL,
  certified_by TEXT NOT NULL,
  certified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, version)
);

ALTER TABLE performance_appeals
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS reviewer_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS assigned_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS outcome TEXT NULL CHECK (outcome IS NULL OR outcome IN ('UPHELD', 'AMENDED')),
  ADD COLUMN IF NOT EXISTS original_rating NUMERIC(5,2) NULL,
  ADD COLUMN IF NOT EXISTS amended_rating NUMERIC(5,2) NULL CHECK (amended_rating IS NULL OR amended_rating BETWEEN 1 AND 5);

-- One open appeal per assessment at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_one_open_appeal
  ON performance_appeals (assessment_id)
  WHERE status IN ('FILED', 'UNDER_REVIEW', 'ESCALATED');
