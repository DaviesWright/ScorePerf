-- Assets part B: write-off with approval, offboarding recovery tasks, per-category overdue thresholds,
-- purchase and warranty fields, and serial numbers unique per company. Idempotent.
-- NOT applied to any database yet. Apply after review.
-- If existing rows already share a serial number within a company, the unique index below fails. Fix those rows first.

-- Categories: overdue threshold (null = use the report's default) and depreciation (informational only).
ALTER TABLE asset_categories
    ADD COLUMN IF NOT EXISTS overdue_days INTEGER,
    ADD COLUMN IF NOT EXISTS depreciation_months INTEGER;

DO $$ BEGIN
    ALTER TABLE asset_categories
        ADD CONSTRAINT asset_categories_overdue_days_check CHECK (overdue_days IS NULL OR overdue_days BETWEEN 1 AND 3650);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE asset_categories
        ADD CONSTRAINT asset_categories_depreciation_check CHECK (depreciation_months IS NULL OR depreciation_months BETWEEN 1 AND 600);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Assets: purchase and warranty fields.
ALTER TABLE company_assets
    ADD COLUMN IF NOT EXISTS purchase_date DATE,
    ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS warranty_expiry DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$ BEGIN
    ALTER TABLE company_assets
        ADD CONSTRAINT company_assets_purchase_price_check CHECK (purchase_price IS NULL OR purchase_price >= 0);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Serial numbers: unique per company where one is recorded. Blank serials ('' from before this migration) are not
-- indexed, so older rows without a serial do not collide.
CREATE UNIQUE INDEX IF NOT EXISTS company_assets_company_serial_unique
    ON company_assets (company_id, serial_number)
    WHERE serial_number IS NOT NULL AND serial_number <> '';

-- Write-off requests. A write-off of an asset held by a current employee stays 'pending' until that employee's solid
-- manager approves or rejects it. A write-off with no current holder is recorded as 'approved' at once by HR.
-- decided_by is the approver. The asset moves to status 'lost' only when a write-off is approved.
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

-- At most one pending write-off per asset.
CREATE UNIQUE INDEX IF NOT EXISTS asset_write_offs_one_pending
    ON asset_write_offs (asset_id) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_asset_write_offs_company_status ON asset_write_offs (company_id, status);

-- Offboarding recovery tasks: "Recover N assets from [name]". One open task per person. HR closes it; the offboarding
-- block itself is enforced separately and does not depend on this table.
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
