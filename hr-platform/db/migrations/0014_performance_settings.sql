-- Company performance settings: one row per company, validated by packages/shared (performanceSettings.ts).
-- Single-framework purity is enforced elsewhere. Idempotent.

CREATE TABLE IF NOT EXISTS performance_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
