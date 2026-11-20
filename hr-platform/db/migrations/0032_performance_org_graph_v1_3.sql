-- ==============================================================================
-- Migration 0032: Performance Management Module v1.3 — First-Class Organogram
-- Implements BUILD.md v1.3:
--   - Effective-dated performance_org_units & performance_org_edges
--   - Append-only history tables (units, edges, delegations)
--   - HRIS sync runs & conflict resolution
--   - Assessment open-time org snapshot columns
--   - Demo org snapshots
-- ==============================================================================

-- 1. Effective-dated Org Units
CREATE TABLE IF NOT EXISTS performance_org_units (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  parent_unit_id TEXT NULL,
  type TEXT NOT NULL CHECK (type IN ('ENTERPRISE', 'BUSINESS_UNIT', 'DEPARTMENT', 'TEAM', 'COST_CENTER')),
  name TEXT NOT NULL,
  code TEXT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE NULL,
  external_ref TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_from <= effective_to)
);

CREATE INDEX IF NOT EXISTS idx_perf_org_units_tenant_parent
  ON performance_org_units (tenant_id, parent_unit_id, effective_from);

-- 2. Effective-dated Multi-Manager Org Edges (Primary, Matrix, Dotted-Line, Delegate)
CREATE TABLE IF NOT EXISTS performance_org_edges (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  subject_employee_id TEXT NOT NULL,
  object_employee_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('PRIMARY_MANAGER', 'MATRIX_MANAGER', 'DOTTED_LINE', 'DELEGATE')),
  scope TEXT NOT NULL DEFAULT 'ALL' CHECK (scope IN ('APPRAISAL', 'GOALS', 'ALL')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE NULL,
  source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('HRIS', 'MANUAL')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PROPOSED', 'ACTIVE', 'CLOSED')),
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (subject_employee_id <> object_employee_id),
  CHECK (effective_to IS NULL OR effective_from <= effective_to)
);

CREATE INDEX IF NOT EXISTS idx_perf_org_edges_lookup
  ON performance_org_edges (tenant_id, subject_employee_id, type, effective_from);

CREATE INDEX IF NOT EXISTS idx_perf_org_edges_manager
  ON performance_org_edges (tenant_id, object_employee_id, type, effective_from);

-- 3. Append-Only Org History Tables
CREATE TABLE IF NOT EXISTS performance_org_edge_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  edge_id TEXT NOT NULL,
  actor_employee_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_org_unit_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  unit_id TEXT NOT NULL,
  actor_employee_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. HRIS Sync Runs & Conflicts
CREATE TABLE IF NOT EXISTS performance_org_sync_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  units_synced INT NOT NULL DEFAULT 0,
  edges_synced INT NOT NULL DEFAULT 0,
  conflicts_detected INT NOT NULL DEFAULT 0,
  triggered_by TEXT NOT NULL DEFAULT 'system',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS performance_org_sync_conflicts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  sync_run_id TEXT NOT NULL REFERENCES performance_org_sync_runs(id) ON DELETE CASCADE,
  subject_employee_id TEXT NOT NULL,
  hris_manager_id TEXT NOT NULL,
  local_manager_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED_HRIS', 'RESOLVED_LOCAL', 'DISMISSED')),
  resolved_by TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_org_sync_conflicts_status
  ON performance_org_sync_conflicts (tenant_id, status);

-- 5. Extend Delegations for full lifecycle (PROPOSED -> APPROVED -> ACTIVE -> EXPIRED/REVOKED)
ALTER TABLE performance_delegations
  ADD COLUMN IF NOT EXISTS approved_by TEXT NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ NULL;

ALTER TABLE performance_delegations
  DROP CONSTRAINT IF EXISTS performance_delegations_status_check;

ALTER TABLE performance_delegations
  ADD CONSTRAINT performance_delegations_status_check
  CHECK (status IN ('PROPOSED', 'APPROVED', 'ACTIVE', 'REVOKED', 'EXPIRED'));

CREATE TABLE IF NOT EXISTS performance_delegation_history (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  delegation_id TEXT NOT NULL,
  actor_employee_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Snapshot Org Unit & Primary Manager on Assessments at Open (Reorg protection)
ALTER TABLE performance_assessments
  ADD COLUMN IF NOT EXISTS org_unit_id_at_open TEXT NULL,
  ADD COLUMN IF NOT EXISTS primary_manager_id_at_open TEXT NULL;

-- 7. Demo Org Graph Snapshots (Isolated)
CREATE TABLE IF NOT EXISTS performance_demo_org_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  demo_session_id TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_demo = TRUE),
  graph_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
