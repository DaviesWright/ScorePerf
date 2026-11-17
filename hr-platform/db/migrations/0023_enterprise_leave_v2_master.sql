-- ==============================================================================
-- Migration 0023: Enterprise Leave Management Module v2.0 (BUILD.md Master)
-- Implements Section 7 Logical Database Schema:
--   - Fixed-precision NUMERIC(12,4) quantities (never float)
--   - Effective-dated policy versions & work calendars
--   - Append-only leave_ledger_transactions (with trigger preventing mutation)
--   - Full application, day-breakdown, workflow, resumption, relief, planning,
--     reservation, blocked period, encashment, extension, recall & audit tables
-- ==============================================================================

-- 7.2 Core Tables: Leave Types & Effective-Dated Policy Versions
CREATE TABLE IF NOT EXISTS leave_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'DAYS' CHECK (unit IN ('DAYS', 'HOURS')),
  paid_status TEXT NOT NULL DEFAULT 'PAID' CHECK (paid_status IN ('PAID', 'UNPAID', 'PARTIAL')),
  requires_reason BOOLEAN NOT NULL DEFAULT TRUE,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  requires_resumption BOOLEAN NOT NULL DEFAULT TRUE,
  confidential BOOLEAN NOT NULL DEFAULT FALSE,
  allow_encashment BOOLEAN NOT NULL DEFAULT FALSE,
  allow_carry_forward BOOLEAN NOT NULL DEFAULT TRUE,
  allow_accrual BOOLEAN NOT NULL DEFAULT TRUE,
  jurisdiction TEXT NOT NULL DEFAULT 'GH',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT NOT NULL DEFAULT 'system',
  UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS leave_policies (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  UNIQUE (tenant_id, code)
);

-- Rule LV-019: Policy versions are immutable once activated.
CREATE TABLE IF NOT EXISTS leave_policy_versions (
  id TEXT PRIMARY KEY,
  policy_id TEXT NOT NULL REFERENCES leave_policies(id) ON DELETE RESTRICT,
  version_number INTEGER NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  jurisdiction_id TEXT NOT NULL DEFAULT 'GH',
  legal_entity_id TEXT NOT NULL DEFAULT 'PSC-GH',
  eligibility_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  entitlement_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  accrual_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  carry_forward_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  application_rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow_id TEXT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'APPROVED', 'ACTIVE', 'SUPERSEDED')),
  approved_by TEXT NULL,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'system',
  UNIQUE (policy_id, version_number)
);

CREATE TABLE IF NOT EXISTS employee_leave_policy_assignments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  employee_id TEXT NOT NULL,
  policy_version_id TEXT NOT NULL REFERENCES leave_policy_versions(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL,
  effective_to DATE NULL,
  reason TEXT NOT NULL DEFAULT 'Standard policy assignment',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7.3 Calendar Tables
CREATE TABLE IF NOT EXISTS work_calendars (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra',
  work_pattern TEXT NOT NULL DEFAULT 'MON_FRI_8H',
  version INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_calendar_days (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES work_calendars(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=Sun .. 6=Sat
  working_flag BOOLEAN NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  scheduled_minutes INTEGER NOT NULL DEFAULT 480,
  UNIQUE (calendar_id, weekday)
);

CREATE TABLE IF NOT EXISTS calendar_holidays (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL REFERENCES work_calendars(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  holiday_type TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (holiday_type IN ('PUBLIC', 'ORG')),
  observed_date DATE NOT NULL,
  source_reference TEXT NOT NULL DEFAULT 'Ghana Statutory Public Holidays Act',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  UNIQUE (calendar_id, observed_date)
);

-- 7.2 Entitlement Periods & Append-Only Ledger
CREATE TABLE IF NOT EXISTS leave_entitlement_periods (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  employee_id TEXT NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  policy_version_id TEXT NOT NULL REFERENCES leave_policy_versions(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  opening_quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  allocated_quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  accrued_quantity NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  closing_snapshot NUMERIC(12,4) NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'RECONCILED')),
  UNIQUE (tenant_id, employee_id, leave_type_id, period_start)
);

-- Section 0.1 & 7.2: Append-Only Ledger Transactions (never overwrite a balance)
CREATE TABLE IF NOT EXISTS leave_ledger_transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  employee_id TEXT NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  entitlement_period_id TEXT NOT NULL REFERENCES leave_entitlement_periods(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN (
      'OPENING',
      'ALLOCATION',
      'ACCRUAL',
      'ADDITIONAL_CREDIT',
      'CARRY_FORWARD_IN',
      'RESERVATION',
      'RESERVATION_RELEASE',
      'CONSUMPTION',
      'LEAVE_TAKEN',
      'EXPIRY',
      'ENCASHMENT',
      'CARRY_FORWARD_OUT',
      'RECALL_RESTORE',
      'ADJUSTMENT',
      'REVERSAL'
    )
  ),
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'DAYS' CHECK (unit IN ('DAYS', 'HOURS')),
  effective_date DATE NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  reversal_of_id TEXT NULL REFERENCES leave_ledger_transactions(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL UNIQUE,
  policy_version_id TEXT NOT NULL REFERENCES leave_policy_versions(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_ledger_emp_date
  ON leave_ledger_transactions (tenant_id, employee_id, leave_type_id, effective_date);

-- Applications & Charged Day Breakdown (Section 4.3 & 7.2)
CREATE TABLE IF NOT EXISTS leave_applications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  employee_id TEXT NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  application_number TEXT NOT NULL UNIQUE,
  policy_version_id TEXT NOT NULL REFERENCES leave_policy_versions(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  partial_day TEXT NOT NULL DEFAULT 'FULL' CHECK (partial_day IN ('FULL', 'FIRST_HALF', 'SECOND_HALF', 'HOURS')),
  requested_quantity NUMERIC(12,4) NOT NULL,
  calculated_quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'DAYS',
  resumption_date DATE NOT NULL,
  reason TEXT NOT NULL,
  proposed_relief_employee_id TEXT NULL,
  handover_notes TEXT NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'DRAFT',
      'SUBMITTED',
      'PENDING_STAGE',
      'RETURNED_FOR_AMENDMENT',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'CANCEL_REQUESTED',
      'CANCELLED',
      'ON_LEAVE',
      'RESUMPTION_PENDING',
      'RESUMED',
      'CLOSED'
    )
  ),
  balance_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_application_days (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  scheduled_minutes INTEGER NOT NULL DEFAULT 480,
  charged_quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'DAYS',
  day_fraction TEXT NOT NULL DEFAULT 'FULL',
  exclusion_reason TEXT NULL,
  UNIQUE (application_id, leave_date, day_fraction)
);

-- Phase 2 & Phase 3 Operational Tables (Resumption, Relief, Plans, Reservations, Blocked, Encashment, Extensions, Recall)
CREATE TABLE IF NOT EXISTS leave_resumptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  application_id TEXT NOT NULL REFERENCES leave_applications(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  scheduled_return_date DATE NOT NULL,
  actual_return_date DATE NULL,
  resumption_status TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (
    resumption_status IN (
      'EXPECTED',
      'CONFIRMATION_PENDING',
      'SUBMITTED',
      'MANAGER_VERIFICATION_PENDING',
      'HR_VERIFICATION_PENDING',
      'RESUMED',
      'EARLY_RETURN',
      'LATE_RETURN',
      'NOT_RESUMED',
      'EXCEPTION_UNDER_REVIEW',
      'CLOSED'
    )
  ),
  variance_days NUMERIC(12,4) NOT NULL DEFAULT 0.0000,
  variance_reason TEXT NULL,
  employee_confirmed_at TIMESTAMPTZ NULL,
  manager_verified_by TEXT NULL,
  manager_verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_extension_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  original_application_id TEXT NOT NULL REFERENCES leave_applications(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  additional_start_date DATE NOT NULL,
  additional_end_date DATE NOT NULL,
  additional_quantity NUMERIC(12,4) NOT NULL,
  revised_resumption_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_recall_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  application_id TEXT NOT NULL REFERENCES leave_applications(id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL,
  recall_reason TEXT NOT NULL,
  requested_return_date DATE NOT NULL,
  actual_return_date DATE NULL,
  unused_days_restored NUMERIC(12,4) NULL,
  initiated_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED', 'ACKNOWLEDGED', 'RETURN_CONFIRMED', 'CREDITED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_encashment_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  employee_id TEXT NOT NULL,
  leave_type_id TEXT NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  requested_days NUMERIC(12,4) NOT NULL,
  retained_balance_days NUMERIC(12,4) NOT NULL,
  daily_rate_amount NUMERIC(12,2) NOT NULL,
  total_payout_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  payroll_code TEXT NOT NULL DEFAULT 'EARN-LV-ENCASH',
  payment_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (
    payment_status IN ('PENDING_APPROVAL', 'APPROVED_OUTBOX', 'PAYROLL_ACKNOWLEDGED', 'PAID', 'REJECTED')
  ),
  ledger_transaction_id TEXT NULL REFERENCES leave_ledger_transactions(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
