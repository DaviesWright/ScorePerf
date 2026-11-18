-- Offices as rows. Each company gets one row per office name in use (migrated from employees.office, which is kept
-- until this migration is verified; a later migration drops it). Each department gets the office most of its people
-- work in (ties go to the lower office id); departments with no office-tagged employees stay NULL.
-- Idempotent. NOT applied to any database yet: review, then apply by hand (db/schema.sql mirrors this file).

CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL DEFAULT '',
    country VARCHAR(2) NOT NULL CONSTRAINT offices_country_check CHECK (country ~ '^[A-Z]{2}$'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

-- 1. Office rows from the text values. The employees.office check allows only London, Accra and Windhoek.
INSERT INTO offices (company_id, name, country)
SELECT DISTINCT e.company_id, e.office,
    CASE e.office WHEN 'London' THEN 'GB' WHEN 'Accra' THEN 'GH' WHEN 'Windhoek' THEN 'NA' END
FROM employees e
WHERE e.office IS NOT NULL
ON CONFLICT (company_id, name) DO NOTHING;

-- 2. The link. Same company only: the office joins on company_id as well as name.
ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_departments_office ON departments (office_id);

-- 3. Backfill: the office most employees of each department are tagged with.
UPDATE departments d
SET office_id = pick.office_id
FROM (
    SELECT DISTINCT ON (e.department_id) e.department_id, o.id AS office_id
    FROM employees e
    JOIN offices o ON o.company_id = e.company_id AND o.name = e.office
    WHERE e.department_id IS NOT NULL AND e.office IS NOT NULL
    GROUP BY e.department_id, o.id
    ORDER BY e.department_id, count(*) DESC, o.id
) pick
WHERE d.id = pick.department_id AND d.office_id IS NULL;
