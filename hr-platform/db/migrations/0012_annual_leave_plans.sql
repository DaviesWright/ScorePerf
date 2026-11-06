-- Annual leave plan: each planned absence for a year. Submitted by the employee, approved by HR at least six weeks
-- before it starts. An entry still unapproved at its deadline is returned to the manager. Idempotent.

CREATE TABLE IF NOT EXISTS annual_leave_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    plan_year INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(5, 2) NOT NULL CHECK (days >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'returned')),
    decided_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT annual_leave_plans_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_annual_leave_plans_company_year ON annual_leave_plans (company_id, plan_year, status);
