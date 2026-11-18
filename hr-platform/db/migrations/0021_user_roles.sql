-- Multi-role access. One person can hold several roles and switch between them in the app.
-- employees.access_role stays as the default role; this table lists every role a person holds.
--
-- Idempotent. Backfill gives every existing employee their current access_role as the primary role,
-- and an 'employee' (self-service) role when their primary is something else. Nobody gains a role they did not have.
-- Roles 'system_admin' and 'supervisor' are reserved: the API does not grant them yet.

CREATE TABLE IF NOT EXISTS user_roles (
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL
        CONSTRAINT user_roles_role_check CHECK (role IN ('employee', 'line_manager', 'hr_admin', 'hr_director', 'system_admin', 'supervisor')),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (employee_id, role)
);

-- At most one primary role per person.
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_one_primary
    ON user_roles (employee_id) WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_user_roles_company ON user_roles (company_id);

-- Backfill: each employee's access_role becomes their primary role.
INSERT INTO user_roles (employee_id, company_id, role, is_primary)
SELECT id, company_id, access_role, true
FROM employees
ON CONFLICT (employee_id, role) DO NOTHING;

-- Backfill: anyone whose primary is not 'employee' also gets the self-service role.
INSERT INTO user_roles (employee_id, company_id, role, is_primary)
SELECT id, company_id, 'employee', false
FROM employees
WHERE access_role <> 'employee'
ON CONFLICT (employee_id, role) DO NOTHING;
