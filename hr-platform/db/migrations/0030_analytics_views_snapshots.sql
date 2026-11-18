-- Migration 0030: Analytics, Heatmaps & Trends Materialized Views & Snapshots
CREATE TABLE IF NOT EXISTS analytics_report_snapshots (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  report_key TEXT NOT NULL,
  parameters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_json JSONB NOT NULL,
  actor_employee_id INTEGER NOT NULL,
  scope TEXT NOT NULL,
  as_at_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_lookup
  ON analytics_report_snapshots (company_id, module, report_key, created_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leave_utilisation AS
SELECT
  e.company_id,
  COALESCE(d.name, 'Unassigned') AS department,
  COALESCE(e.role, 'Staff') AS job_role,
  EXTRACT(MONTH FROM lr.start_date)::int AS month_num,
  TO_CHAR(lr.start_date, 'Mon') AS month_label,
  COUNT(DISTINCT e.id)::int AS employee_count,
  COALESCE(SUM(lr.requested_days) FILTER (WHERE lr.status = 'approved'), 0)::int AS days_taken
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.company_id = e.company_id
WHERE e.is_active = TRUE
GROUP BY e.company_id, d.name, e.role, EXTRACT(MONTH FROM lr.start_date), TO_CHAR(lr.start_date, 'Mon');

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_org_health AS
SELECT
  e.company_id,
  COALESCE(d.name, 'Unassigned') AS department,
  COUNT(*) FILTER (WHERE e.is_active = TRUE)::int AS headcount,
  COUNT(*) FILTER (WHERE e.is_active = FALSE)::int AS leavers
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
GROUP BY e.company_id, d.name;
