-- ==============================================================================
-- Migration 0027: Leave Management Addendum v1.1 (HR Manager Console & ESS Mode)
-- Implements Section A.3:
--   - user_dashboard_preferences (default mode, scope, department, welcome name)
--   - audit_logs / arch_audit_log support for DASHBOARD_MODE_SWITCHED
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT NOT NULL,
  default_mode TEXT NOT NULL DEFAULT 'role' CHECK (default_mode IN ('role', 'ess')),
  default_scope TEXT NOT NULL DEFAULT 'company' CHECK (default_scope IN ('department', 'company', 'team')),
  default_department_id TEXT NULL,
  welcome_name_preference TEXT NOT NULL DEFAULT 'full_name' CHECK (welcome_name_preference IN ('first_name', 'full_name', 'preferred_name')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);
