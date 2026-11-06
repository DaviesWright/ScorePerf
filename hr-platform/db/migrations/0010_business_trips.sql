-- Business trips. Requested like leave, approved by the solid manager (or HR), and shown on the team and company views
-- as "Travel" so colleagues can see who is away. Trips do not reduce leave balances. Idempotent.

CREATE TABLE IF NOT EXISTS business_trips (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    destination VARCHAR(200) NOT NULL,
    purpose TEXT NOT NULL DEFAULT '',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    decided_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT business_trips_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_business_trips_company_dates ON business_trips (company_id, start_date, end_date);
