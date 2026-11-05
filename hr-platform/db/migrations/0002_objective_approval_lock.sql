-- Objective approval and lock.
--
-- Employees draft objectives (title, weight, target, metric), submit them for approval, and a manager or HR
-- approves them. Approval stamps approved_by / approved_at / locked_at. From then on the database itself refuses
-- to change or delete the objective, so the rule holds even for SQL run outside the API. The only way to change
-- an approved objective is an amendment: a transaction that sets app.amend = 'on' (the API does this, for HR
-- roles only) and records who changed what and why in objective_amendments.
--
-- Progress (progress_percentage) stays updatable on a locked objective: it is the employee's ongoing work, not
-- the agreed objective. Cascading deletes (an employee or cycle being removed) are not blocked.
--
-- Idempotent. employee_objectives was empty when this was written, so the stricter status values are safe.

ALTER TABLE employee_objectives
    ADD COLUMN IF NOT EXISTS weight NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS target VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS metric VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE employee_objectives ALTER COLUMN status SET DEFAULT 'draft';

DO $$ BEGIN
    ALTER TABLE employee_objectives
        ADD CONSTRAINT employee_objectives_status_check
        CHECK (status IN ('draft', 'submitted', 'approved', 'returned'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE employee_objectives
        ADD CONSTRAINT employee_objectives_weight_check
        CHECK (weight >= 0 AND weight <= 100);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- An approved objective must carry its approval stamp and lock together.
DO $$ BEGIN
    ALTER TABLE employee_objectives
        ADD CONSTRAINT employee_objectives_approved_stamp_check
        CHECK (status <> 'approved' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND locked_at IS NOT NULL));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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
