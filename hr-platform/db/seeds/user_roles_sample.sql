-- SAMPLE DATA ONLY: local development database (hrcheck). Never run against Neon or any real company.
-- Adds extra roles to two existing test users so the role switcher has more than one role to show.
--   Ama Director (hr_director, primary) also holds system_admin.
--   Kofi Manager (line_manager, primary) also holds supervisor.
-- The self-service ('employee') role for both comes from migration 0021's backfill.
-- Idempotent.

INSERT INTO user_roles (employee_id, company_id, role, is_primary)
SELECT e.id, e.company_id, 'system_admin', false
FROM employees e
WHERE e.email = 'director@hrcheck.test'
ON CONFLICT (employee_id, role) DO NOTHING;

INSERT INTO user_roles (employee_id, company_id, role, is_primary)
SELECT e.id, e.company_id, 'supervisor', false
FROM employees e
WHERE e.email = 'manager@hrcheck.test'
ON CONFLICT (employee_id, role) DO NOTHING;
