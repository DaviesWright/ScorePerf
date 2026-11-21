-- ==============================================================================
-- Migration 0041: Squads, redeployments, custom rating scales (to-do P1)
-- These screens existed in the UI with browser-only state, so anything created
-- was lost on refresh and invisible to colleagues. This gives them storage and
-- an append-only audit trail (who, when, what changed, from which screen).
-- ==============================================================================

-- Append-only audit of workforce record changes. Rows are never updated or deleted.
CREATE TABLE IF NOT EXISTS workforce_audit_events (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_employee_id INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('squad', 'squad_member', 'redeployment', 'employee', 'rating_scale')),
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  source TEXT NOT NULL DEFAULT 'UI',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workforce_audit_company_created ON workforce_audit_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workforce_audit_entity ON workforce_audit_events (company_id, entity_type, entity_id);

CREATE OR REPLACE FUNCTION workforce_audit_events_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'workforce_audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workforce_audit_events_immutable ON workforce_audit_events;
CREATE TRIGGER trg_workforce_audit_events_immutable
  BEFORE UPDATE OR DELETE ON workforce_audit_events
  FOR EACH ROW EXECUTE FUNCTION workforce_audit_events_immutable();

-- Groups and squads.
CREATE TABLE IF NOT EXISTS workforce_squads (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  lead_employee_id INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  mission TEXT NOT NULL DEFAULT '',
  active_focus VARCHAR(120) NOT NULL DEFAULT '',
  created_by INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS workforce_squads_unique_name
  ON workforce_squads (company_id, lower(name)) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS workforce_squad_members (
  squad_id INTEGER NOT NULL REFERENCES workforce_squads(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  added_by INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (squad_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_workforce_squad_members_employee ON workforce_squad_members (company_id, employee_id);

-- Internal redeployments: requested, approved by HR (not the requester), then applied to the employee record.
CREATE TABLE IF NOT EXISTS workforce_redeployments (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_department_id INTEGER NULL REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  from_job_title VARCHAR(120) NULL,
  to_job_title VARCHAR(120) NOT NULL,
  effective_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  requested_by INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  decided_by INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NULL,
  decision_note TEXT NULL,
  applied_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workforce_redeployments_company ON workforce_redeployments (company_id, status, effective_date);
-- One open request per employee at a time.
CREATE UNIQUE INDEX IF NOT EXISTS workforce_redeployments_one_open
  ON workforce_redeployments (company_id, employee_id) WHERE status IN ('pending', 'approved');

-- Custom rating scales defined by HR (levels: [{score, label, description}]).
CREATE TABLE IF NOT EXISTS performance_rating_scales (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  scope VARCHAR(200) NOT NULL DEFAULT '',
  levels JSONB NOT NULL,
  created_by INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS performance_rating_scales_unique_name
  ON performance_rating_scales (company_id, lower(name)) WHERE archived_at IS NULL;
