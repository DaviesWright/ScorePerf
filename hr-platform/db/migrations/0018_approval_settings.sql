-- Approval levels: one row per company, validated by packages/shared (approvalLevels.ts). Absent row = defaults.
-- Idempotent. NOT applied to any database yet: review, then apply by hand (db/schema.sql mirrors this file).

CREATE TABLE IF NOT EXISTS approval_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
