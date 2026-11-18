-- ==============================================================================
-- Migration 0022: Skills Framework v1.2 (20 Skills / 5 Categories / 5 Levels)
-- Implements Addendum v1.2 §2.2 Data Model, §3 Proficiency Scale, and VAL-SKILL-*
-- "Competency" is deprecated; all schema tables and columns use "skill_*".
-- ==============================================================================

CREATE TABLE IF NOT EXISTS skill_category (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('TECH', 'EXEC', 'PPL', 'LEAD', 'PERS')),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES skill_category(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- VAL-SKILL-002: skill_proficiency_level must be an integer 1..5
CREATE TABLE IF NOT EXISTS skill_proficiency_level (
  id TEXT PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE CHECK (level BETWEEN 1 AND 5),
  label TEXT NOT NULL UNIQUE CHECK (label IN ('Novice', 'Developing', 'Proficient', 'Advanced', 'Expert')),
  descriptor TEXT NOT NULL
);

-- VAL-SKILL-003: required_level must be 1..5 or NULL (skill not required for role)
CREATE TABLE IF NOT EXISTS role_skill_profile (
  id TEXT PRIMARY KEY,
  job_family_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skill(id) ON DELETE RESTRICT,
  required_level INTEGER NULL CHECK (required_level IS NULL OR (required_level BETWEEN 1 AND 5)),
  weight NUMERIC(5,2) NULL,
  UNIQUE (job_family_id, skill_id)
);

-- §2.2 & VAL-SKILL-004 / VAL-SKILL-005: employee_skill_assessment
CREATE TABLE IF NOT EXISTS employee_skill_assessment (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  skill_id TEXT NOT NULL REFERENCES skill(id) ON DELETE RESTRICT,
  self_rating INTEGER NULL CHECK (self_rating IS NULL OR (self_rating BETWEEN 1 AND 5)),
  manager_rating INTEGER NULL CHECK (manager_rating IS NULL OR (manager_rating BETWEEN 1 AND 5)),
  final_rating INTEGER NULL CHECK (final_rating IS NULL OR (final_rating BETWEEN 1 AND 5)),
  evidence_note TEXT NULL,
  calibration_justification TEXT NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assessed_by TEXT NULL,
  UNIQUE (employee_id, cycle_id, skill_id)
);

-- Seed 5 Proficiency Levels (§3)
INSERT INTO skill_proficiency_level (id, level, label, descriptor) VALUES
  ('LVL-1', 1, 'Novice',     'Requires close guidance; limited applied experience.'),
  ('LVL-2', 2, 'Developing', 'Works with occasional support; building confidence.'),
  ('LVL-3', 3, 'Proficient', 'Works independently to expected standard.'),
  ('LVL-4', 4, 'Advanced',   'Handles complex cases; guides others.'),
  ('LVL-5', 5, 'Expert',     'Recognized authority; sets standards; mentors broadly.')
ON CONFLICT (level) DO UPDATE
  SET label = EXCLUDED.label,
      descriptor = EXCLUDED.descriptor;

-- Seed 5 Categories (§2.1)
INSERT INTO skill_category (id, code, name, display_order, description) VALUES
  ('CAT-TECH', 'TECH', '1. Technical & Functional', 1, 'Core domain mastery, quantitative analytics, systems fluency, and structured technical problem-solving.'),
  ('CAT-EXEC', 'EXEC', '2. Execution & Delivery',   2, 'Planning, operational rigor, deadline reliability, and fiscal/resource discipline.'),
  ('CAT-PPL',  'PPL',  '3. People & Collaboration', 3, 'Clarity of communication, cross-functional teamwork, stakeholder trust, and active coaching.'),
  ('CAT-LEAD', 'LEAD', '4. Leadership & Strategy',  4, 'Long-horizon strategic thinking, sound judgment, innovation leadership, and talent development.'),
  ('CAT-PERS', 'PERS', '5. Personal Effectiveness', 5, 'End-to-end ownership, composure under pressure, learning velocity, and ethical integrity.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      display_order = EXCLUDED.display_order,
      description = EXCLUDED.description;

-- Seed 20 Skills across 5 Categories (4 per category, §2.1)
INSERT INTO skill (id, category_id, code, name, description, display_order, is_active) VALUES
  ('SK-1.1', 'CAT-TECH', '1.1', 'Domain Expertise',                         'Applies deep functional and statutory knowledge to deliver accurate, high-impact work outputs.', 1, TRUE),
  ('SK-1.2', 'CAT-TECH', '1.2', 'Data & Analytics',                         'Interprets metrics, builds quantitative models, and grounds decisions in verifiable evidence.', 2, TRUE),
  ('SK-1.3', 'CAT-TECH', '1.3', 'Tools & Systems Proficiency',              'Uses core enterprise platforms, AI workflows, and technical toolchains to accelerate productivity.', 3, TRUE),
  ('SK-1.4', 'CAT-TECH', '1.4', 'Technical Problem-Solving',                'Diagnoses root causes systematically and engineers resilient solutions to complex operational problems.', 4, TRUE),

  ('SK-2.1', 'CAT-EXEC', '2.1', 'Planning & Prioritization',                'Sequences milestones effectively, focuses on high-leverage deliverables, and manages dependencies.', 5, TRUE),
  ('SK-2.2', 'CAT-EXEC', '2.2', 'Quality & Accuracy',                       'Maintains high craftsmanship, zero-defect verification standards, and thorough customer satisfaction.', 6, TRUE),
  ('SK-2.3', 'CAT-EXEC', '2.3', 'Time & Deadline Management',               'Delivers on schedule against SLA commitments and communicates early when timelines shift.', 7, TRUE),
  ('SK-2.4', 'CAT-EXEC', '2.4', 'Resource & Budget Discipline',             'Develops and manages budgets prudently, controls costs, and executes result-based fiscal actions.', 8, TRUE),

  ('SK-3.1', 'CAT-PPL',  '3.1', 'Communication',                            'Conveys complex ideas clearly in writing and speech; listens actively across all levels.', 9, TRUE),
  ('SK-3.2', 'CAT-PPL',  '3.2', 'Teamwork & Cross-functional Collaboration','Works effectively across squads, supports colleagues, and puts shared outcomes ahead of silos.', 10, TRUE),
  ('SK-3.3', 'CAT-PPL',  '3.3', 'Stakeholder Management',                   'Builds durable trust with internal leaders, external partners, and clients through respect and reliability.', 11, TRUE),
  ('SK-3.4', 'CAT-PPL',  '3.4', 'Coaching & Knowledge Sharing',             'Provides guidance, documentation, and hands-on mentorship to grow peers and junior colleagues.', 12, TRUE),

  ('SK-4.1', 'CAT-LEAD', '4.1', 'Strategic Thinking',                       'Connects daily execution to long-term institutional objectives and market trajectories.', 13, TRUE),
  ('SK-4.2', 'CAT-LEAD', '4.2', 'Decision-Making',                          'Makes timely, well-reasoned decisions under ambiguity and commits cleanly to execution.', 14, TRUE),
  ('SK-4.3', 'CAT-LEAD', '4.3', 'Change & Innovation',                      'Champions process improvements, leads organizational transitions, and turns novel ideas into practice.', 15, TRUE),
  ('SK-4.4', 'CAT-LEAD', '4.4', 'People Leadership & Development',          'Develops subordinates, sets clear expectations, and cultivates psychological safety and career growth.', 16, TRUE),

  ('SK-5.1', 'CAT-PERS', '5.1', 'Ownership & Accountability',               'Accepts challenges with confidence, follows through on commitments, and owns outcomes end-to-end.', 17, TRUE),
  ('SK-5.2', 'CAT-PERS', '5.2', 'Adaptability & Resilience',                'Manages pressure and setbacks constructively while sustaining productivity in changing environments.', 18, TRUE),
  ('SK-5.3', 'CAT-PERS', '5.3', 'Learning Agility',                         'Shows strong inner drive for self-development and rapidly applies new skills to emerging challenges.', 19, TRUE),
  ('SK-5.4', 'CAT-PERS', '5.4', 'Integrity & Professional Judgment',        'Adheres to laid-down regulations, ethical codes, and sound professional judgment at all times.', 20, TRUE)
ON CONFLICT (code) DO UPDATE
  SET category_id = EXCLUDED.category_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active;
