-- ==============================================================================
-- Migration 0024: Shared Organisational Core & Three-Experience Architecture
-- Implements ESS · MSS · HRMS over a single time-bound reporting-line graph:
--   - company, org_unit (Division -> Department -> Team -> CostCentre)
--   - job_family, position, employment (time-bound manager_employee_id edge)
--   - role, permission, role_permission, user_role_assignment (SELF|TEAM|ORG_UNIT|COMPANY)
--   - audit_log (append-only, records actor, context ESS|MSS|HRMS, resolved scope, before/after)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_retention_days INTEGER NOT NULL DEFAULT 2555, -- 7 years statutory default
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_unit (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  parent_org_unit_id TEXT NULL REFERENCES org_unit(id) ON DELETE RESTRICT,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('Division', 'Department', 'Team', 'CostCentre')),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_employee_id TEXT NULL,
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_org_unit_parent ON org_unit (company_id, parent_org_unit_id);

CREATE TABLE IF NOT EXISTS job_family (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS position (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  org_unit_id TEXT NOT NULL REFERENCES org_unit(id) ON DELETE RESTRICT,
  job_family_id TEXT NOT NULL REFERENCES job_family(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  grade TEXT NOT NULL,
  is_managerial BOOLEAN NOT NULL DEFAULT FALSE
);

-- Section 3.2 (FR-ARCH-003, NFR-ARCH-003): Reporting line stored as time-bound employment edge
CREATE TABLE IF NOT EXISTS employment (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  position_id TEXT NOT NULL REFERENCES position(id) ON DELETE RESTRICT,
  org_unit_id TEXT NOT NULL REFERENCES org_unit(id) ON DELETE RESTRICT,
  manager_employee_id TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NULL,
  change_reason TEXT NOT NULL DEFAULT 'Hire / Assignment',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employment_manager_dates
  ON employment (company_id, manager_employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_employment_employee_dates
  ON employment (company_id, employee_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_employment_org_unit_dates
  ON employment (company_id, org_unit_id, start_date, end_date);

-- Section 3.1 & 9: Roles, Permissions & Scoped Role Assignments
CREATE TABLE IF NOT EXISTS arch_role (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (
    code IN ('EMPLOYEE', 'MANAGER', 'HR_OFFICER', 'HR_MANAGER', 'EXECUTIVE', 'SUPER_ADMIN')
  ),
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arch_permission (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  experience TEXT NOT NULL CHECK (experience IN ('ESS', 'MSS', 'HRMS', 'SHARED')),
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arch_role_permission (
  role_id TEXT NOT NULL REFERENCES arch_role(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES arch_permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_role_assignment (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES arch_role(id) ON DELETE RESTRICT,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('SELF', 'TEAM', 'ORG_UNIT', 'COMPANY')),
  scope_id TEXT NULL, -- NULL for SELF/COMPANY, org_unit.id for ORG_UNIT
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE NULL
);

CREATE INDEX IF NOT EXISTS idx_user_role_assignment_lookup
  ON user_role_assignment (company_id, user_id, role_id, scope_id);

-- Section 4 & 10 (FR-ARCH-010, VAL-ARCH-007, NFR-ARCH-005): Immutable Scoped Audit Log
CREATE TABLE IF NOT EXISTS arch_audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
  actor_user_id TEXT NOT NULL,
  actor_employee_id TEXT NOT NULL,
  experience_context TEXT NOT NULL CHECK (experience_context IN ('ESS', 'MSS', 'HRMS')),
  resolved_scope_type TEXT NOT NULL CHECK (resolved_scope_type IN ('SELF', 'TEAM', 'ORG_UNIT', 'COMPANY')),
  resolved_scope_id TEXT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json JSONB NULL,
  after_json JSONB NULL,
  justification TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arch_audit_log_company_time
  ON arch_audit_log (company_id, created_at DESC);

-- Seed Core Company, Org Units, Job Families, Roles & Permissions (Deliverable #4)
INSERT INTO company (id, name, data_retention_days) VALUES
  ('COMP-SENRAB-GH', 'Senrab ConsulTech / ScoreviewHR Ghana', 2555)
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_unit (id, company_id, parent_org_unit_id, unit_type, name, code, head_employee_id) VALUES
  ('OU-DIV-TECH', 'COMP-SENRAB-GH', NULL,          'Division',   'Technology & Cloud Division',         'DIV-TECH', 'EMP-SJ-002'),
  ('OU-DIV-CORP', 'COMP-SENRAB-GH', NULL,          'Division',   'Corporate & People Division',         'DIV-CORP', 'EMP-JR-003'),
  ('OU-DEP-PLAT', 'COMP-SENRAB-GH', 'OU-DIV-TECH', 'Department', 'Platform & Edge Engineering',         'DEP-PLAT', 'EMP-PKB-001'),
  ('OU-DEP-FINT', 'COMP-SENRAB-GH', 'OU-DIV-TECH', 'Department', 'FinTech & Payments Product',          'DEP-FINT', 'EMP-MC-004'),
  ('OU-DEP-PPL',  'COMP-SENRAB-GH', 'OU-DIV-CORP', 'Department', 'People, Culture & Talent Strategy',   'DEP-PPL',  'EMP-JR-003'),
  ('OU-TEAM-EDGE','COMP-SENRAB-GH', 'OU-DEP-PLAT', 'Team',       'West Africa Cloud Edge Squad',        'TM-EDGE',  'EMP-PKB-001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_family (id, company_id, name) VALUES
  ('JF-ENG', 'COMP-SENRAB-GH', 'Engineering & Architecture'),
  ('JF-PPL', 'COMP-SENRAB-GH', 'People & Culture'),
  ('JF-FIN', 'COMP-SENRAB-GH', 'Finance & Corporate Operations')
ON CONFLICT (id) DO NOTHING;

INSERT INTO arch_role (id, code, name, description) VALUES
  ('ROLE-EMP',   'EMPLOYEE',    'Employee (ESS)',            'Personal self-service across profile, leave, performance, skills, documents, and requests.'),
  ('ROLE-MGR',   'MANAGER',     'Manager (MSS)',             'Supervisor, Team Lead, Department Head, or Division Head acting on resolved reporting-line subtree.'),
  ('ROLE-HRO',   'HR_OFFICER',  'HR Officer (Scoped HRMS)',  'HR administration scoped to assigned organisational units.'),
  ('ROLE-HRM',   'HR_MANAGER',  'HR Manager (Company HRMS)', 'Company-wide HR governance, cycles, policies, calibration, and analytics.'),
  ('ROLE-EXEC',  'EXECUTIVE',   'Executive (Read-Only HRMS)','Read-only company-wide analytics, liability, and compliance dashboards.'),
  ('ROLE-ADMIN', 'SUPER_ADMIN', 'Super Admin (Full HRMS)',   'Full company governance, cycle revert, integrations, and immutable audit review.')
ON CONFLICT (code) DO NOTHING;
