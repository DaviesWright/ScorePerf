-- ==============================================================================
-- Migration 0031: Performance Management Module v1.1 & v1.2
-- Implements BUILD.md v1.2:
--   - v1.1 Objective Volume Policy (8 min, 10 max per employee per cycle)
--   - v1.1 Isolated Demo Appraisal Workspace & Reports
--   - v1.2 Manager Appraisal Flow, Manager Drafts, Revision Requests & Delegation
-- ==============================================================================

-- 1. Extend performance_goals with is_demo & focus_area_id
ALTER TABLE performance_goals
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS focus_area_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_performance_goals_demo_cycle_owner
  ON performance_goals (tenant_id, cycle_id, owner_employee_id, is_demo);

-- 2. Extend performance_assessments with v1.2 manager-owned state & self-assessment payload
ALTER TABLE performance_assessments
  ADD COLUMN IF NOT EXISTS manager_sub_status TEXT NOT NULL DEFAULT 'MANAGER_NOT_STARTED',
  ADD COLUMN IF NOT EXISTS revision_round INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_revision_rounds INT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS self_submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS manager_submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS self_summary TEXT NULL,
  ADD COLUMN IF NOT EXISTS self_items_json JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Objective Volume Policy (v1.1: min >= 8, max <= 10)
CREATE TABLE IF NOT EXISTS performance_objective_volume_policies (
  tenant_id TEXT PRIMARY KEY,
  min_objectives INT NOT NULL DEFAULT 8 CHECK (min_objectives >= 8),
  max_objectives INT NOT NULL DEFAULT 10 CHECK (max_objectives <= 10),
  per_focus_floor INT NOT NULL DEFAULT 2 CHECK (per_focus_floor >= 0),
  enforcement TEXT NOT NULL DEFAULT 'warn' CHECK (enforcement IN ('warn', 'block')),
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (min_objectives <= max_objectives)
);

INSERT INTO performance_objective_volume_policies (tenant_id, min_objectives, max_objectives, per_focus_floor, enforcement)
VALUES ('default', 8, 10, 2, 'warn')
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Manager Delegation (v1.2 §5.9, §8.6, ADR-PM-12)
CREATE TABLE IF NOT EXISTS performance_delegations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  delegator_id TEXT NOT NULL,
  delegate_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  scope TEXT NOT NULL DEFAULT 'ALL_DIRECT_REPORTS',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (delegator_id <> delegate_id),
  CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_performance_delegations_active
  ON performance_delegations (tenant_id, delegate_id, status, start_date, end_date);

-- 5. Manager Assessments & Drafts (v1.2 §6.8.1, §7.2, §7.3)
CREATE TABLE IF NOT EXISTS performance_manager_assessments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL UNIQUE,
  manager_id TEXT NOT NULL,
  acted_by_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'MANAGER_NOT_STARTED' CHECK (status IN ('MANAGER_NOT_STARTED', 'MANAGER_DRAFT', 'MANAGER_COMPLETE', 'MANAGER_REVISION_REQUESTED')),
  overall_rating NUMERIC(5,2) NULL,
  strengths TEXT NOT NULL DEFAULT '',
  development_areas TEXT NOT NULL DEFAULT '',
  recommended_actions TEXT NOT NULL DEFAULT '',
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Manager Revision Requests (v1.2 §10.8)
CREATE TABLE IF NOT EXISTS performance_manager_revision_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL,
  manager_id TEXT NOT NULL,
  acted_by_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  round_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Isolated Demo Appraisal Workspace (v1.1 §5.8, §6.14, §7.6, ADR-PM-10)
CREATE TABLE IF NOT EXISTS performance_demo_appraisals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  assessment_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  cycle_id TEXT NOT NULL,
  framework TEXT NOT NULL DEFAULT 'BSC',
  is_demo BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_demo = TRUE),
  overall_rating NUMERIC(5,2) NULL,
  self_summary TEXT NOT NULL DEFAULT '',
  manager_summary TEXT NOT NULL DEFAULT '',
  strengths TEXT NOT NULL DEFAULT '',
  development_areas TEXT NOT NULL DEFAULT '',
  objectives_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, assessment_id)
);

CREATE TABLE IF NOT EXISTS performance_demo_reports (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  demo_appraisal_id TEXT NOT NULL REFERENCES performance_demo_appraisals(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('PDF', 'DOCX', 'CSV', 'JSON')),
  disclaimer TEXT NOT NULL DEFAULT 'DEMO — NOT A LIVE APPRAISAL',
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
