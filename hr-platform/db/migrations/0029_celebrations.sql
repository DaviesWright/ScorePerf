-- Migration 0029: Celebrations & Continuous Feedback Recognition
CREATE TABLE IF NOT EXISTS employee_celebrations_settings (
  employee_id INTEGER PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL,
  show_birthday BOOLEAN NOT NULL DEFAULT TRUE,
  show_anniversary BOOLEAN NOT NULL DEFAULT TRUE,
  show_birth_year BOOLEAN NOT NULL DEFAULT FALSE,
  custom_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS continuous_feedback (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  from_employee_id INTEGER NOT NULL,
  to_employee_id INTEGER NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'PRAISE',
  message TEXT NOT NULL,
  celebration_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_continuous_feedback_to
  ON continuous_feedback (company_id, to_employee_id, created_at DESC);

CREATE OR REPLACE VIEW upcoming_celebrations AS
SELECT
  'bday-' || e.id AS id,
  e.company_id,
  e.id AS employee_id,
  'BIRTHDAY'::text AS celebration_type,
  e.date_of_birth AS event_date,
  NULL::int AS years_of_service,
  'COMPANY'::text AS visibility_scope
FROM employees e
LEFT JOIN employee_celebrations_settings ecs ON ecs.employee_id = e.id
WHERE e.is_active = TRUE
  AND e.date_of_birth IS NOT NULL
  AND COALESCE(ecs.show_birthday, TRUE) = TRUE
UNION ALL
SELECT
  'anniv-' || e.id AS id,
  e.company_id,
  e.id AS employee_id,
  'WORK_ANNIVERSARY'::text AS celebration_type,
  e.created_at::date AS event_date,
  GREATEST(1, EXTRACT(YEAR FROM CURRENT_DATE)::int - EXTRACT(YEAR FROM e.created_at)::int) AS years_of_service,
  'COMPANY'::text AS visibility_scope
FROM employees e
LEFT JOIN employee_celebrations_settings ecs ON ecs.employee_id = e.id
WHERE e.is_active = TRUE
  AND COALESCE(ecs.show_anniversary, TRUE) = TRUE;
