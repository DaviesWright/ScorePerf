-- ==============================================================================
-- Migration 0038: Report request log (to-do P1)
-- Every free-text report request that does not produce a report is recorded with
-- the prompt, the error code and the response the user saw, so HR can see what
-- people ask for and what the catalogue is missing. Append-only.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS report_request_log (
  id BIGSERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id INTEGER NULL REFERENCES employees(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  prompt TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('out_of_scope', 'forbidden', 'invalid', 'error')),
  error_code TEXT NOT NULL,
  response TEXT NOT NULL,
  closest_report_key TEXT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_request_log_company_created
  ON report_request_log (company_id, created_at DESC);
