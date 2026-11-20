-- ==============================================================================
-- Migration 0033: Asset Management Addendum (P13)
-- Implements P13.1–P13.4:
--   - Soft-delete support on company_assets (deleted_at)
--   - Expected return date & notes on asset_allocations
--   - Append-only, immutable asset_audit_events (ASSIGN / RETURN / TRANSFER)
-- ==============================================================================

ALTER TABLE company_assets
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

ALTER TABLE asset_allocations
  ADD COLUMN IF NOT EXISTS expected_return_date DATE NULL,
  ADD COLUMN IF NOT EXISTS assignment_notes TEXT NULL;

CREATE TABLE IF NOT EXISTS asset_audit_events (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  actor_user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('ASSIGN', 'RETURN', 'TRANSFER')),
  asset_id INTEGER NOT NULL,
  previous_assignee_id INTEGER NULL,
  new_assignee_id INTEGER NULL,
  effective_date DATE NOT NULL,
  expected_return_date DATE NULL,
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'UI' CHECK (source IN ('UI', 'API', 'IMPORT')),
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_audit_company_asset
  ON asset_audit_events (company_id, asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_audit_company_assignees
  ON asset_audit_events (company_id, new_assignee_id, previous_assignee_id);
