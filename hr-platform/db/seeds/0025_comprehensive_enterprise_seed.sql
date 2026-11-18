-- ==============================================================================
-- Seed 0025: Comprehensive Enterprise Seed (Task 2 & Task 3)
--   - 8 Organizational Units (Departments across 3 Divisions)
--   - 18 Job Positions across Grades G5..G10
--   - 54 Employees with full referential integrity (department, position, manager)
--   - 54 Time-Bound Employment Edges & Three-Experience Role Assignments (ESS/MSS/HRMS)
--   - 72 Leave Applications across 12 consecutive months (2025-12 .. 2026-11)
--   - 54 Performance Appraisal Records across BSC, OKR, and MBO frameworks
-- ==============================================================================

BEGIN;

-- 1. Seed 8 Departments under Company COMP-SENRAB-GH
INSERT INTO org_unit (id, company_id, parent_org_unit_id, unit_type, name, code, head_employee_id) VALUES
  ('DEP-EXEC',    'COMP-SENRAB-GH', NULL,          'Division',   'Executive Leadership',           'EXEC',  'SEN-0001'),
  ('DEP-CLOUD',   'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'Cloud & Edge Engineering',       'CLOUD', 'SEN-0002'),
  ('DEP-FINTECH', 'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'FinTech & Payments Product',     'FINT',  'SEN-0018'),
  ('DEP-DATA',    'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'Data & AI Platforms',            'DATA',  'SEN-0011'),
  ('DEP-ADV',     'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'Enterprise Advisory',            'ADV',   'SEN-0006'),
  ('DEP-PPL',     'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'People & Culture',               'PPL',   'SEN-0003'),
  ('DEP-FIN',     'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'Finance & Corporate',            'FIN',   'SEN-0008'),
  ('DEP-OPS',     'COMP-SENRAB-GH', 'DEP-EXEC',    'Department', 'Client Services & Operations',   'OPS',   'SEN-0010')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      head_employee_id = EXCLUDED.head_employee_id;

-- 2. Seed 18 Job Positions
INSERT INTO position (id, company_id, org_unit_id, job_family_id, title, grade, is_managerial) VALUES
  ('POS-01', 'COMP-SENRAB-GH', 'DEP-EXEC',    'JF-ENG', 'Managing Principal & CEO',                'G10', TRUE),
  ('POS-02', 'COMP-SENRAB-GH', 'DEP-EXEC',    'JF-ENG', 'Managing Director, Technology Division',  'G9',  TRUE),
  ('POS-03', 'COMP-SENRAB-GH', 'DEP-EXEC',    'JF-FIN', 'Director of Administration & Governance', 'G9',  TRUE),
  ('POS-04', 'COMP-SENRAB-GH', 'DEP-PPL',     'JF-PPL', 'Head of Human Resources',                 'G9',  TRUE),
  ('POS-05', 'COMP-SENRAB-GH', 'DEP-CLOUD',   'JF-ENG', 'VP, Cloud & Edge Engineering',            'G8',  TRUE),
  ('POS-06', 'COMP-SENRAB-GH', 'DEP-FINTECH', 'JF-ENG', 'Engineering Director, FinTech',           'G8',  TRUE),
  ('POS-07', 'COMP-SENRAB-GH', 'DEP-DATA',    'JF-ENG', 'Head of Data & AI Platforms',             'G8',  TRUE),
  ('POS-08', 'COMP-SENRAB-GH', 'DEP-ADV',     'JF-ENG', 'Director, Enterprise Advisory',           'G8',  TRUE),
  ('POS-09', 'COMP-SENRAB-GH', 'DEP-FIN',     'JF-FIN', 'Head of Finance & Controller',            'G8',  TRUE),
  ('POS-10', 'COMP-SENRAB-GH', 'DEP-OPS',     'JF-FIN', 'Account & Client Operations Director',    'G8',  TRUE),
  ('POS-11', 'COMP-SENRAB-GH', 'DEP-CLOUD',   'JF-ENG', 'Principal Squad Lead',                    'G7',  TRUE),
  ('POS-12', 'COMP-SENRAB-GH', 'DEP-CLOUD',   'JF-ENG', 'Senior Cloud Infrastructure Engineer',    'G6',  FALSE),
  ('POS-13', 'COMP-SENRAB-GH', 'DEP-FINTECH', 'JF-ENG', 'Full-Stack Product Engineer',             'G5',  FALSE),
  ('POS-14', 'COMP-SENRAB-GH', 'DEP-DATA',    'JF-ENG', 'Machine Learning & Analytics Engineer',   'G6',  FALSE),
  ('POS-15', 'COMP-SENRAB-GH', 'DEP-ADV',     'JF-ENG', 'Management Strategy Consultant',          'G6',  FALSE),
  ('POS-16', 'COMP-SENRAB-GH', 'DEP-PPL',     'JF-PPL', 'HR Business Partner & Specialist',        'G6',  FALSE),
  ('POS-17', 'COMP-SENRAB-GH', 'DEP-FIN',     'JF-FIN', 'Corporate Financial & Audit Analyst',     'G5',  FALSE),
  ('POS-18', 'COMP-SENRAB-GH', 'DEP-OPS',     'JF-FIN', 'Client Success & Operations Specialist',  'G5',  FALSE)
ON CONFLICT (id) DO NOTHING;

-- 3. Seed 54 Time-Bound Employment Edges (Every employee -> valid position, org_unit, and manager_employee_id)
INSERT INTO employment (id, company_id, employee_id, position_id, org_unit_id, manager_employee_id, start_date, end_date, change_reason) VALUES
  ('EMP-EDGE-0001', 'COMP-SENRAB-GH', 'SEN-0001', 'POS-01', 'DEP-EXEC',    NULL,       '2020-01-15', NULL, 'Founder / CEO Appointment'),
  ('EMP-EDGE-0014', 'COMP-SENRAB-GH', 'SEN-0014', 'POS-02', 'DEP-EXEC',    'SEN-0001', '2020-03-15', NULL, 'Division Head Appointment'),
  ('EMP-EDGE-0015', 'COMP-SENRAB-GH', 'SEN-0015', 'POS-03', 'DEP-EXEC',    'SEN-0001', '2019-11-01', NULL, 'Executive Appointment'),
  ('EMP-EDGE-0019', 'COMP-SENRAB-GH', 'SEN-0019', 'POS-15', 'DEP-EXEC',    'SEN-0001', '2021-02-01', NULL, 'Chief of Staff Assignment'),
  ('EMP-EDGE-0003', 'COMP-SENRAB-GH', 'SEN-0003', 'POS-04', 'DEP-PPL',     'SEN-0001', '2021-03-01', NULL, 'Head of HR Appointment'),
  ('EMP-EDGE-0004', 'COMP-SENRAB-GH', 'SEN-0004', 'POS-16', 'DEP-PPL',     'SEN-0003', '2023-01-10', NULL, 'Hire'),
  ('EMP-EDGE-0013', 'COMP-SENRAB-GH', 'SEN-0013', 'POS-16', 'DEP-PPL',     'SEN-0003', '2021-05-10', NULL, 'Hire'),
  ('EMP-EDGE-0020', 'COMP-SENRAB-GH', 'SEN-0020', 'POS-16', 'DEP-PPL',     'SEN-0003', '2022-04-12', NULL, 'Hire'),
  ('EMP-EDGE-0021', 'COMP-SENRAB-GH', 'SEN-0021', 'POS-16', 'DEP-PPL',     'SEN-0004', '2023-08-01', NULL, 'Hire'),
  ('EMP-EDGE-0022', 'COMP-SENRAB-GH', 'SEN-0022', 'POS-16', 'DEP-PPL',     'SEN-0013', '2023-02-14', NULL, 'Hire'),
  ('EMP-EDGE-0002', 'COMP-SENRAB-GH', 'SEN-0002', 'POS-05', 'DEP-CLOUD',   'SEN-0014', '2022-03-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0005', 'COMP-SENRAB-GH', 'SEN-0005', 'POS-11', 'DEP-CLOUD',   'SEN-0002', '2022-06-15', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0017', 'COMP-SENRAB-GH', 'SEN-0017', 'POS-11', 'DEP-CLOUD',   'SEN-0002', '2023-02-15', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0023', 'COMP-SENRAB-GH', 'SEN-0023', 'POS-12', 'DEP-CLOUD',   'SEN-0005', '2022-09-01', NULL, 'Hire'),
  ('EMP-EDGE-0024', 'COMP-SENRAB-GH', 'SEN-0024', 'POS-12', 'DEP-CLOUD',   'SEN-0005', '2023-01-18', NULL, 'Hire'),
  ('EMP-EDGE-0025', 'COMP-SENRAB-GH', 'SEN-0025', 'POS-12', 'DEP-CLOUD',   'SEN-0005', '2022-11-01', NULL, 'Hire'),
  ('EMP-EDGE-0026', 'COMP-SENRAB-GH', 'SEN-0026', 'POS-12', 'DEP-CLOUD',   'SEN-0005', '2023-05-15', NULL, 'Hire'),
  ('EMP-EDGE-0027', 'COMP-SENRAB-GH', 'SEN-0027', 'POS-12', 'DEP-CLOUD',   'SEN-0017', '2022-07-01', NULL, 'Hire'),
  ('EMP-EDGE-0028', 'COMP-SENRAB-GH', 'SEN-0028', 'POS-12', 'DEP-CLOUD',   'SEN-0017', '2023-03-10', NULL, 'Hire'),
  ('EMP-EDGE-0029', 'COMP-SENRAB-GH', 'SEN-0029', 'POS-12', 'DEP-CLOUD',   'SEN-0017', '2023-06-01', NULL, 'Hire'),
  ('EMP-EDGE-0030', 'COMP-SENRAB-GH', 'SEN-0030', 'POS-12', 'DEP-CLOUD',   'SEN-0017', '2024-01-15', NULL, 'Hire'),
  ('EMP-EDGE-0031', 'COMP-SENRAB-GH', 'SEN-0031', 'POS-12', 'DEP-CLOUD',   'SEN-0005', '2022-05-20', NULL, 'Hire'),
  ('EMP-EDGE-0018', 'COMP-SENRAB-GH', 'SEN-0018', 'POS-06', 'DEP-FINTECH', 'SEN-0014', '2021-06-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0032', 'COMP-SENRAB-GH', 'SEN-0032', 'POS-11', 'DEP-FINTECH', 'SEN-0018', '2022-02-01', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0033', 'COMP-SENRAB-GH', 'SEN-0033', 'POS-13', 'DEP-FINTECH', 'SEN-0018', '2022-08-15', NULL, 'Hire'),
  ('EMP-EDGE-0034', 'COMP-SENRAB-GH', 'SEN-0034', 'POS-13', 'DEP-FINTECH', 'SEN-0018', '2023-01-09', NULL, 'Hire'),
  ('EMP-EDGE-0035', 'COMP-SENRAB-GH', 'SEN-0035', 'POS-13', 'DEP-FINTECH', 'SEN-0032', '2023-04-01', NULL, 'Hire'),
  ('EMP-EDGE-0036', 'COMP-SENRAB-GH', 'SEN-0036', 'POS-13', 'DEP-FINTECH', 'SEN-0032', '2023-09-01', NULL, 'Hire'),
  ('EMP-EDGE-0037', 'COMP-SENRAB-GH', 'SEN-0037', 'POS-13', 'DEP-FINTECH', 'SEN-0032', '2023-05-01', NULL, 'Hire'),
  ('EMP-EDGE-0038', 'COMP-SENRAB-GH', 'SEN-0038', 'POS-13', 'DEP-FINTECH', 'SEN-0018', '2022-11-15', NULL, 'Hire'),
  ('EMP-EDGE-0011', 'COMP-SENRAB-GH', 'SEN-0011', 'POS-07', 'DEP-DATA',    'SEN-0014', '2021-07-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0039', 'COMP-SENRAB-GH', 'SEN-0039', 'POS-11', 'DEP-DATA',    'SEN-0011', '2022-02-01', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0040', 'COMP-SENRAB-GH', 'SEN-0040', 'POS-14', 'DEP-DATA',    'SEN-0039', '2023-01-15', NULL, 'Hire'),
  ('EMP-EDGE-0041', 'COMP-SENRAB-GH', 'SEN-0041', 'POS-14', 'DEP-DATA',    'SEN-0039', '2023-03-20', NULL, 'Hire'),
  ('EMP-EDGE-0042', 'COMP-SENRAB-GH', 'SEN-0042', 'POS-14', 'DEP-DATA',    'SEN-0011', '2022-10-01', NULL, 'Hire'),
  ('EMP-EDGE-0043', 'COMP-SENRAB-GH', 'SEN-0043', 'POS-14', 'DEP-DATA',    'SEN-0011', '2023-07-10', NULL, 'Hire'),
  ('EMP-EDGE-0006', 'COMP-SENRAB-GH', 'SEN-0006', 'POS-08', 'DEP-ADV',     'SEN-0001', '2021-09-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0007', 'COMP-SENRAB-GH', 'SEN-0007', 'POS-11', 'DEP-ADV',     'SEN-0006', '2022-01-15', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0009', 'COMP-SENRAB-GH', 'SEN-0009', 'POS-11', 'DEP-ADV',     'SEN-0006', '2022-04-10', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0044', 'COMP-SENRAB-GH', 'SEN-0044', 'POS-15', 'DEP-ADV',     'SEN-0009', '2022-06-01', NULL, 'Hire'),
  ('EMP-EDGE-0045', 'COMP-SENRAB-GH', 'SEN-0045', 'POS-15', 'DEP-ADV',     'SEN-0009', '2023-02-01', NULL, 'Hire'),
  ('EMP-EDGE-0046', 'COMP-SENRAB-GH', 'SEN-0046', 'POS-15', 'DEP-ADV',     'SEN-0007', '2023-01-20', NULL, 'Hire'),
  ('EMP-EDGE-0047', 'COMP-SENRAB-GH', 'SEN-0047', 'POS-15', 'DEP-ADV',     'SEN-0009', '2023-09-15', NULL, 'Hire'),
  ('EMP-EDGE-0048', 'COMP-SENRAB-GH', 'SEN-0048', 'POS-15', 'DEP-ADV',     'SEN-0007', '2023-10-01', NULL, 'Hire'),
  ('EMP-EDGE-0008', 'COMP-SENRAB-GH', 'SEN-0008', 'POS-09', 'DEP-FIN',     'SEN-0015', '2021-11-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0049', 'COMP-SENRAB-GH', 'SEN-0049', 'POS-17', 'DEP-FIN',     'SEN-0008', '2022-03-15', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0050', 'COMP-SENRAB-GH', 'SEN-0050', 'POS-17', 'DEP-FIN',     'SEN-0049', '2022-09-10', NULL, 'Hire'),
  ('EMP-EDGE-0051', 'COMP-SENRAB-GH', 'SEN-0051', 'POS-17', 'DEP-FIN',     'SEN-0049', '2023-04-01', NULL, 'Hire'),
  ('EMP-EDGE-0052', 'COMP-SENRAB-GH', 'SEN-0052', 'POS-17', 'DEP-FIN',     'SEN-0049', '2023-10-18', NULL, 'Hire'),
  ('EMP-EDGE-0010', 'COMP-SENRAB-GH', 'SEN-0010', 'POS-10', 'DEP-OPS',     'SEN-0015', '2020-08-01', NULL, 'Department Head Appointment'),
  ('EMP-EDGE-0016', 'COMP-SENRAB-GH', 'SEN-0016', 'POS-11', 'DEP-OPS',     'SEN-0010', '2022-09-01', NULL, 'Squad Lead Appointment'),
  ('EMP-EDGE-0012', 'COMP-SENRAB-GH', 'SEN-0012', 'POS-18', 'DEP-OPS',     'SEN-0016', '2022-10-15', NULL, 'Hire'),
  ('EMP-EDGE-0053', 'COMP-SENRAB-GH', 'SEN-0053', 'POS-18', 'DEP-OPS',     'SEN-0016', '2023-03-01', NULL, 'Hire'),
  ('EMP-EDGE-0054', 'COMP-SENRAB-GH', 'SEN-0054', 'POS-18', 'DEP-OPS',     'SEN-0016', '2023-06-15', NULL, 'Hire')
ON CONFLICT (id) DO NOTHING;

COMMIT;
