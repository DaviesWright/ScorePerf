-- ==============================================================================
-- Migration 0034: ESS Shortcuts & Personal Celebrations (Opt-In)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS personal_celebrations (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'TEAM' CHECK (visibility IN ('TEAM', 'PRIVATE')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_celebrations_company_date
  ON personal_celebrations (company_id, event_date);

CREATE TABLE IF NOT EXISTS employee_shortcut_preferences (
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  pinned_ids JSONB NOT NULL DEFAULT '["apply_leave","view_payslip","my_goals","my_assets"]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, employee_id)
);
