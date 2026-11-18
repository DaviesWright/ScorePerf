-- Migration 0028: Leave Mini-Dashboard Snapshots (Addendum 2 v1.2)
CREATE TABLE IF NOT EXISTS leave_mini_dashboard_snapshots (
  id TEXT PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  variant TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_leave_mini_dashboard_lookup
  ON leave_mini_dashboard_snapshots (tenant_id, variant, scope_key, expires_at DESC);
