-- Assets: make asset_allocations the assignment ledger and add the rules the spec needs.
-- Existing data (51 open allocations, 3 available assets) already satisfies every constraint below; checked before
-- writing. Legacy condition_on_allocation is free text ("Brand New (...)") and is left as it is; returns use the
-- new condition_on_return, which has a fixed scale.
-- Idempotent.

ALTER TABLE asset_allocations
    ADD COLUMN IF NOT EXISTS assigned_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS condition_on_return VARCHAR(20),
    ADD COLUMN IF NOT EXISTS return_notes TEXT;

DO $$ BEGIN
    ALTER TABLE asset_allocations
        ADD CONSTRAINT asset_allocations_condition_return_check
        CHECK (condition_on_return IS NULL OR condition_on_return IN ('new', 'good', 'fair', 'poor'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- At most one open assignment per asset.
CREATE UNIQUE INDEX IF NOT EXISTS asset_allocations_one_open
    ON asset_allocations (asset_id) WHERE return_date IS NULL;

ALTER TABLE company_assets
    ADD COLUMN IF NOT EXISTS asset_condition VARCHAR(20) NOT NULL DEFAULT 'good';

DO $$ BEGIN
    ALTER TABLE company_assets
        ADD CONSTRAINT company_assets_condition_check CHECK (asset_condition IN ('new', 'good', 'fair', 'poor'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE company_assets
        ADD CONSTRAINT company_assets_status_check
        CHECK (status IN ('available', 'allocated', 'maintenance', 'retired', 'lost'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
