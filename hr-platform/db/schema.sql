-- ==============================================================================
-- ScoReview / HR-Platform PostgreSQL Schema
-- Cloudflare SaaS Multi-Tenant Performance Platform
-- ==============================================================================

-- 1. Tenants & Identity
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    hq BOOLEAN DEFAULT false NOT NULL,
    country VARCHAR(2) DEFAULT 'US',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee' NOT NULL, -- job title only; never used for authorization
    access_role VARCHAR(20) DEFAULT 'employee' NOT NULL
        CONSTRAINT employees_access_role_check CHECK (access_role IN ('employee', 'line_manager', 'hr_admin', 'hr_director')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    date_of_birth DATE, -- db/migrations/0003_announcements_and_birthdays.sql; birthdays show only when set
    office VARCHAR(20) -- db/migrations/0004_employee_office.sql: London, Accra or Windhoek
        CONSTRAINT employees_office_check CHECK (office IS NULL OR office IN ('London', 'Accra', 'Windhoek')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, email)
);

-- 2. Frameworks & Methodologies
DO $$ BEGIN
    CREATE TYPE framework_code AS ENUM ('OKR', 'MBO', 'BSC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS framework_types (
    id SERIAL PRIMARY KEY,
    code framework_code UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

INSERT INTO framework_types (code, name, description)
VALUES 
    ('OKR', 'Objectives and Key Results', 'Quarterly outcome-driven agile goal management'),
    ('MBO', 'Management by Objectives', 'Cascading objective framework with formal weights'),
    ('BSC', 'Balanced Scorecard', 'Four-perspective corporate strategic performance tracking')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS framework_configurations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    framework_type_id INTEGER NOT NULL REFERENCES framework_types(id) ON DELETE RESTRICT,
    version INTEGER DEFAULT 1 NOT NULL,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, framework_type_id, version)
);

-- 3. Performance Cycles (State Machine)
DO $$ BEGIN
    CREATE TYPE cycle_status AS ENUM (
        'draft',
        'configured',
        'approved',
        'active',
        'review',
        'calibration',
        'approval',
        'certified',
        'published',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS performance_cycles (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    framework_type_id INTEGER NOT NULL REFERENCES framework_types(id) ON DELETE RESTRICT,
    framework_configuration_id INTEGER REFERENCES framework_configurations(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status cycle_status DEFAULT 'draft' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_cycle_dates CHECK (end_date >= start_date)
);

-- Enforce Framework Immutability per Appraisal Cycle (Strict Single Framework per Appraisal)
CREATE OR REPLACE FUNCTION check_cycle_framework_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.framework_type_id IS DISTINCT FROM NEW.framework_type_id THEN
        RAISE EXCEPTION 'Framework cannot be changed once chosen for a performance appraisal cycle (Cycle ID: %). Mixed frameworks are prohibited.', OLD.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cycle_framework_immutable ON performance_cycles;
CREATE TRIGGER trg_cycle_framework_immutable
BEFORE UPDATE OF framework_type_id ON performance_cycles
FOR EACH ROW
EXECUTE FUNCTION check_cycle_framework_immutable();

CREATE TABLE IF NOT EXISTS performance_assignments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cycle_id INTEGER NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'assigned' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (cycle_id, employee_id)
);

-- 4. KPIs & OKRs
CREATE TABLE IF NOT EXISTS kpis (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target NUMERIC(12, 2) NOT NULL,
    current NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    unit VARCHAR(50) DEFAULT 'count' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS objectives (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    duration INTEGER DEFAULT 90 NOT NULL,
    archive BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS key_results (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    objective_id INTEGER REFERENCES objectives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_value NUMERIC(12, 2) DEFAULT 100 NOT NULL,
    start_value NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    archive BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS employee_objectives (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cycle_id INTEGER REFERENCES performance_cycles(id) ON DELETE SET NULL,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    objective_id INTEGER REFERENCES objectives(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    -- Approval workflow (db/migrations/0002_objective_approval_lock.sql): draft -> submitted -> approved | returned.
    -- Approved objectives are locked by trigger trg_objective_lock; changes go through objective_amendments.
    status VARCHAR(50) DEFAULT 'draft' NOT NULL
        CONSTRAINT employee_objectives_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'returned')),
    weight NUMERIC(5, 2) NOT NULL DEFAULT 0
        CONSTRAINT employee_objectives_weight_check CHECK (weight >= 0 AND weight <= 100),
    target VARCHAR(255) NOT NULL DEFAULT '',
    metric VARCHAR(255) NOT NULL DEFAULT '',
    approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    locked_at TIMESTAMPTZ,
    progress_percentage INTEGER DEFAULT 0 NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT employee_objectives_approved_stamp_check
        CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND locked_at IS NOT NULL))
);

-- Reporting lines (migration 0006): one solid line per employee decides approvals; dotted lines give visibility.
CREATE TABLE IF NOT EXISTS reporting_lines (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    manager_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    kind VARCHAR(10) NOT NULL CHECK (kind IN ('solid', 'dotted')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (employee_id, manager_id),
    CONSTRAINT reporting_lines_not_self CHECK (employee_id <> manager_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS reporting_lines_one_solid
    ON reporting_lines (employee_id) WHERE kind = 'solid';

CREATE INDEX IF NOT EXISTS idx_reporting_lines_manager ON reporting_lines (manager_id);

-- Corporate strategy goals loaded from CSV by HR (migration 0005). A load replaces the company's whole strategy.
CREATE TABLE IF NOT EXISTS corporate_strategy_goals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    perspective VARCHAR(100) NOT NULL,
    objective VARCHAR(255) NOT NULL,
    measure VARCHAR(255) NOT NULL,
    target NUMERIC(14, 2) NOT NULL CHECK (target >= 0),
    owner VARCHAR(100),
    weight NUMERIC(5, 2) CHECK (weight IS NULL OR (weight > 0 AND weight <= 100)),
    loaded_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    loaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corporate_strategy_company ON corporate_strategy_goals(company_id);

-- Company performance settings (migration 0014). One row per company; validated in packages/shared.
CREATE TABLE IF NOT EXISTS performance_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- In-app notifications (migration 0011): leave and trip events to the solid manager and HR.
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_id, read_at, created_at);

-- Business trips (migration 0010): requested like leave, decided by the solid manager or HR, shown as "Travel".
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

-- Staff announcements, posted by hr_admin (migration 0003). Visible from published_on through expires_on.
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    published_on DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_on DATE,
    created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT announcements_dates_check CHECK (expires_on IS NULL OR expires_on >= published_on)
);

CREATE INDEX IF NOT EXISTS idx_announcements_company_dates ON announcements(company_id, published_on, expires_on);

CREATE TABLE IF NOT EXISTS objective_amendments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    objective_id INTEGER REFERENCES employee_objectives(id) ON DELETE SET NULL,
    amended_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    before_values JSONB NOT NULL,
    after_values JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_objective_amendments_objective ON objective_amendments(objective_id);

CREATE OR REPLACE FUNCTION enforce_objective_lock()
RETURNS TRIGGER AS $$
BEGIN
    -- Direct statements only: pg_trigger_depth() is 1 for them and higher for cascades from other tables.
    IF pg_trigger_depth() > 1 THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;

    IF OLD.locked_at IS NOT NULL AND COALESCE(current_setting('app.amend', true), '') <> 'on' THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Approved objective % is locked and cannot be deleted', OLD.id USING ERRCODE = 'check_violation';
        END IF;
        IF NEW.title IS DISTINCT FROM OLD.title
           OR NEW.weight IS DISTINCT FROM OLD.weight
           OR NEW.target IS DISTINCT FROM OLD.target
           OR NEW.metric IS DISTINCT FROM OLD.metric
           OR NEW.cycle_id IS DISTINCT FROM OLD.cycle_id
           OR NEW.employee_id IS DISTINCT FROM OLD.employee_id
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
           OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
           OR NEW.locked_at IS DISTINCT FROM OLD.locked_at THEN
            RAISE EXCEPTION 'Approved objective % is locked; change it through an amendment', OLD.id USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_objective_lock ON employee_objectives;
CREATE TRIGGER trg_objective_lock
    BEFORE UPDATE OR DELETE ON employee_objectives
    FOR EACH ROW EXECUTE FUNCTION enforce_objective_lock();

CREATE TABLE IF NOT EXISTS employee_key_results (
    id SERIAL PRIMARY KEY,
    employee_objective_id INTEGER NOT NULL REFERENCES employee_objectives(id) ON DELETE CASCADE,
    key_result_id INTEGER NOT NULL REFERENCES key_results(id) ON DELETE RESTRICT,
    start_value NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    current_value NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    target_value NUMERIC(12, 2) DEFAULT 100 NOT NULL,
    progress_percentage INTEGER DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'Not Started' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Reviews, Calibration & Scoring
CREATE TABLE IF NOT EXISTS performance_reviews (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    cycle_id INTEGER NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    self_score NUMERIC(5, 2),
    manager_score NUMERIC(5, 2),
    calibrated_score NUMERIC(5, 2),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (cycle_id, employee_id, reviewer_id)
);

-- 6. Audit & History Logging (ADR-0013)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    actor_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Recruitment & ATS
CREATE TABLE IF NOT EXISTS job_positions (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    vacancies INTEGER DEFAULT 1 NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_position_id INTEGER REFERENCES job_positions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT '' NOT NULL,
    resume_url TEXT,
    stage VARCHAR(50) DEFAULT 'applied' NOT NULL,
    rating NUMERIC(3, 1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. Onboarding & Offboarding
CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS offboarding_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    resignation_date DATE NOT NULL,
    last_working_day DATE NOT NULL,
    reason TEXT DEFAULT '' NOT NULL,
    status VARCHAR(50) DEFAULT 'submitted' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Attendance & Time Tracking
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    total_hours NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'present' NOT NULL,
    overtime_hours NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, employee_id, attendance_date)
);

-- 10. Leave Management
CREATE TABLE IF NOT EXISTS leave_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    default_days INTEGER DEFAULT 14 NOT NULL,
    is_carry_forward BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    requires_evidence BOOLEAN NOT NULL DEFAULT false, -- migration 0013: doctor's note or photo needed before approval
    approval_chain VARCHAR(20) NOT NULL DEFAULT 'manager' -- migration 0013: 'manager' or 'manager_then_hr'
        CONSTRAINT leave_types_approval_chain_check CHECK (approval_chain IN ('manager', 'manager_then_hr')),
    carry_forward_limit NUMERIC(5, 2) CHECK (carry_forward_limit IS NULL OR carry_forward_limit >= 0), -- migration 0013
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS leave_allocations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total_days NUMERIC(5, 2) NOT NULL,
    used_days NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    requested_days NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    reason TEXT DEFAULT '' NOT NULL,
    approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decision_comment TEXT, -- migration 0008: reason given with a decision (required for rejection)
    decided_at TIMESTAMPTZ, -- migration 0008
    current_step SMALLINT NOT NULL DEFAULT 1, -- migration 0013: 1 = solid manager, 2 = HR
    half_day_period VARCHAR(10) -- migration 0009: morning or afternoon for a half-day request; NULL otherwise
        CONSTRAINT leave_requests_half_day_check CHECK (half_day_period IS NULL OR half_day_period IN ('morning', 'afternoon')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Evidence for leave (migration 0013): files stored in the DOCS bucket, linked to the request.
CREATE TABLE IF NOT EXISTS leave_evidence (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    request_id INTEGER NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
    uploaded_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_evidence_request ON leave_evidence (request_id);

-- Balance adjustments by HR (migration 0013): kept with the reason and who made them.
CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    plan_year INTEGER NOT NULL,
    days NUMERIC(5, 2) NOT NULL CHECK (days <> 0),
    reason TEXT NOT NULL,
    adjusted_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leave_adjustments_balance ON leave_balance_adjustments (company_id, employee_id, leave_type_id, plan_year);

-- Annual leave plan (migration 0012): planned absences; HR approves at least six weeks before the start.
CREATE TABLE IF NOT EXISTS annual_leave_plans (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    plan_year INTEGER NOT NULL,
    leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(5, 2) NOT NULL CHECK (days >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'approved', 'returned')),
    decided_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT annual_leave_plans_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_annual_leave_plans_company_year ON annual_leave_plans (company_id, plan_year, status);

CREATE TABLE IF NOT EXISTS company_holidays (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, holiday_date)
);

-- 11. Payroll & Compensation
CREATE TABLE IF NOT EXISTS salary_structures (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    base_salary NUMERIC(12, 2) NOT NULL,
    allowances JSONB DEFAULT '{}'::jsonb NOT NULL,
    deductions JSONB DEFAULT '{}'::jsonb NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS employee_contracts (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    salary_structure_id INTEGER REFERENCES salary_structures(id) ON DELETE RESTRICT,
    wage NUMERIC(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    gross_pay NUMERIC(12, 2) NOT NULL,
    deductions NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    net_pay NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL,
    paid_at TIMESTAMPTZ,
    storage_key TEXT, -- migration 0015: PDF object key in the DOCS bucket
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, employee_id, month, year)
);

-- 12. Asset Management
CREATE TABLE IF NOT EXISTS asset_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    overdue_days INTEGER CONSTRAINT asset_categories_overdue_days_check CHECK (overdue_days IS NULL OR overdue_days BETWEEN 1 AND 3650), -- migration 0019
    depreciation_months INTEGER CONSTRAINT asset_categories_depreciation_check CHECK (depreciation_months IS NULL OR depreciation_months BETWEEN 1 AND 600), -- migration 0019
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS company_assets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES asset_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    asset_code VARCHAR(100) UNIQUE NOT NULL,
    serial_number VARCHAR(100) DEFAULT '',
    status VARCHAR(50) DEFAULT 'available' NOT NULL
        CONSTRAINT company_assets_status_check CHECK (status IN ('available', 'allocated', 'maintenance', 'retired', 'lost')),
    asset_condition VARCHAR(20) DEFAULT 'good' NOT NULL -- migration 0007: new, good, fair or poor
        CONSTRAINT company_assets_condition_check CHECK (asset_condition IN ('new', 'good', 'fair', 'poor')),
    purchase_date DATE, -- migration 0019
    purchase_price NUMERIC(12, 2) CONSTRAINT company_assets_purchase_price_check CHECK (purchase_price IS NULL OR purchase_price >= 0), -- migration 0019
    warranty_expiry DATE, -- migration 0019
    notes TEXT, -- migration 0019
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Migration 0019: serial numbers unique per company where recorded.
CREATE UNIQUE INDEX IF NOT EXISTS company_assets_company_serial_unique
    ON company_assets (company_id, serial_number) WHERE serial_number IS NOT NULL AND serial_number <> '';

-- Assignment ledger. An open assignment has return_date NULL; migration 0007 allows at most one per asset.
CREATE TABLE IF NOT EXISTS asset_allocations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES company_assets(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    allocated_date DATE NOT NULL,
    return_date DATE,
    condition_on_allocation VARCHAR(255) DEFAULT 'Good',
    assigned_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    condition_on_return VARCHAR(20)
        CONSTRAINT asset_allocations_condition_return_check CHECK (condition_on_return IS NULL OR condition_on_return IN ('new', 'good', 'fair', 'poor')),
    return_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_allocations_one_open
    ON asset_allocations (asset_id) WHERE return_date IS NULL;

-- Migration 0019: write-off requests (pending until the holder's solid manager decides; approved at once when no current holder).
CREATE TABLE IF NOT EXISTS asset_write_offs (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES company_assets(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES asset_allocations(id) ON DELETE SET NULL,
    holder_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 1000),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    decided_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_note TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_write_offs_one_pending
    ON asset_write_offs (asset_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_asset_write_offs_company_status ON asset_write_offs (company_id, status);

-- Migration 0019: offboarding recovery tasks, one open task per person.
CREATE TABLE IF NOT EXISTS asset_recovery_tasks (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    closed_at TIMESTAMPTZ,
    close_note TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS asset_recovery_tasks_one_open
    ON asset_recovery_tasks (employee_id) WHERE status = 'open';

-- 13. Helpdesk & Support
CREATE TABLE IF NOT EXISTS helpdesk_categories (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS helpdesk_tickets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES helpdesk_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 14. Projects, Timesheets & Documents
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '' NOT NULL,
    status VARCHAR(50) DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS project_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'todo' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS timesheets (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    hours NUMERIC(5, 2) NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS document_types (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    requires_approval BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type_id INTEGER REFERENCES document_types(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    expiry_date DATE,
    acknowledged_at TIMESTAMPTZ, -- migration 0015
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Self-service (migration 0015). Banking and tax values change only through an approved request.
CREATE TABLE IF NOT EXISTS employee_bank_tax_fields (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    field VARCHAR(40) NOT NULL
        CONSTRAINT employee_bank_tax_fields_field_check CHECK (field IN ('bankName', 'accountHolderName', 'accountNumber', 'routingCode', 'taxId')),
    value TEXT NOT NULL,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (employee_id, field)
);

CREATE TABLE IF NOT EXISTS profile_change_requests (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    field VARCHAR(40) NOT NULL
        CONSTRAINT profile_change_requests_field_check CHECK (field IN ('bankName', 'accountHolderName', 'accountNumber', 'routingCode', 'taxId')),
    old_value TEXT NOT NULL DEFAULT '',
    new_value TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CONSTRAINT profile_change_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
    decided_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT profile_change_requests_decided_check CHECK (status = 'pending' OR decided_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_change_requests_one_pending
    ON profile_change_requests (employee_id, field) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_company_status ON profile_change_requests (company_id, status);

-- Indexes for Multi-Tenant Query Acceleration
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_cycles_company_status ON performance_cycles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_cycle ON performance_assignments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_emp_objectives_company ON employee_objectives(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_objectives_cycle ON employee_objectives(cycle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_audit_company_created ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_date ON attendance_records(company_id, employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(company_id, employee_id, status);
CREATE INDEX IF NOT EXISTS idx_payslips_emp_period ON payslips(company_id, employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_tickets_company_status ON helpdesk_tickets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(company_id, job_position_id, stage);

-- Offices as rows and the department link (migration 0016). The backfill is data, so it lives only in the migration.
CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL DEFAULT '',
    country VARCHAR(2) NOT NULL CONSTRAINT offices_country_check CHECK (country ~ '^[A-Z]{2}$'),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE (company_id, name)
);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_departments_office ON departments (office_id);

-- Integration connections (migration 0017). Secret values are never stored; secret_refs names Worker secrets.
CREATE TABLE IF NOT EXISTS integration_connections (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL
        CONSTRAINT integration_connections_provider_check CHECK (provider IN ('business_central', 'seamless_hr', 'clay_hr', 'coursera')),
    label VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    base_url TEXT NOT NULL DEFAULT '',
    secret_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (company_id, provider)
);

-- Approval levels (migration 0018). Absent row = defaults from packages/shared (approvalLevels.ts).
CREATE TABLE IF NOT EXISTS approval_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    settings JSONB NOT NULL,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

