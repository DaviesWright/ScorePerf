-- Leave: evidence for leave types that require it, approval chains per leave type, carry-forward cap, the step a
-- request is at, uploaded evidence records, and balance adjustments (with the reason and who made them). Idempotent.

ALTER TABLE leave_types
    ADD COLUMN IF NOT EXISTS requires_evidence BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS approval_chain VARCHAR(20) NOT NULL DEFAULT 'manager',
    ADD COLUMN IF NOT EXISTS carry_forward_limit NUMERIC(5, 2) CHECK (carry_forward_limit IS NULL OR carry_forward_limit >= 0);

DO $$ BEGIN
    ALTER TABLE leave_types
        ADD CONSTRAINT leave_types_approval_chain_check CHECK (approval_chain IN ('manager', 'manager_then_hr'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS current_step SMALLINT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS leave_evidence (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    uploaded_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_evidence_request ON leave_evidence (request_id);

CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    plan_year INTEGER NOT NULL,
    days NUMERIC(5, 2) NOT NULL CHECK (days <> 0),
    reason TEXT NOT NULL,
    adjusted_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_adjustments_balance ON leave_balance_adjustments (company_id, employee_id, leave_type_id, plan_year);
