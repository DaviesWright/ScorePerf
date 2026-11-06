-- Reporting lines. An employee can have several managers: exactly one solid line (decides approvals) and any number
-- of dotted lines (visibility and comment only). Managers see their direct and dotted reports.
-- Idempotent.

CREATE TABLE IF NOT EXISTS reporting_lines (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('solid', 'dotted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (employee_id, manager_id),
    CONSTRAINT reporting_lines_not_self CHECK (employee_id <> manager_id)
);

-- At most one solid line per employee.
CREATE UNIQUE INDEX IF NOT EXISTS reporting_lines_one_solid
    ON reporting_lines (employee_id) WHERE kind = 'solid';

CREATE INDEX IF NOT EXISTS idx_reporting_lines_manager ON reporting_lines (manager_id);
