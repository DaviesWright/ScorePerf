-- Self-service (migration 0015): banking and tax changes with HR approval, payslip files, document acknowledgments.
-- Idempotent. NOT applied to any database yet: review, then apply by hand (db/schema.sql mirrors this file).

-- 1. Banking and tax values. One row per employee per field. A value changes only when an HR approval is applied.
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

-- Requests from employees. old_value is the stored value when the request was made; new_value is applied on approval.
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

-- At most one open request per employee and field.
CREATE UNIQUE INDEX IF NOT EXISTS profile_change_requests_one_pending
    ON profile_change_requests (employee_id, field) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_profile_change_requests_company_status ON profile_change_requests (company_id, status);

-- 2. Payslip files. storage_key is the object key of the PDF in the DOCS bucket (NULL for rows without a file).
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS storage_key TEXT;

-- 3. Document acknowledgments. A published document has one employee_documents row per active employee;
-- file_url holds the object key of the PDF in the DOCS bucket. acknowledged_at is set when the employee acknowledges.
ALTER TABLE employee_documents ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
