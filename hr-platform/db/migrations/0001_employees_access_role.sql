-- Access role for sign-in (magic link) and API authorization.
--
-- employees.role holds the job title (admin, manager, engineer, ...). It must never grant access: any
-- signed-in user can set it when creating an employee. employees.access_role is the only column the
-- API reads for authorization, and nothing in the API writes it. Change it directly in SQL, e.g.:
--   UPDATE employees SET access_role = 'hr_director' WHERE company_id = 1 AND lower(email) = 'name@example.com';
--
-- Idempotent. Every existing row starts as 'employee', so nobody is elevated by running this.

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS access_role VARCHAR(20) NOT NULL DEFAULT 'employee';

DO $$ BEGIN
    ALTER TABLE employees
        ADD CONSTRAINT employees_access_role_check
        CHECK (access_role IN ('employee', 'line_manager', 'hr_admin', 'hr_director'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
