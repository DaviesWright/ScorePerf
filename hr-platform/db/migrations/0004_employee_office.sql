-- Office for each employee: London, Accra (Ghana) or Windhoek. Nullable until HR sets it. Used to filter reports.
-- Idempotent.

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS office VARCHAR(20);

DO $$ BEGIN
    ALTER TABLE employees
        ADD CONSTRAINT employees_office_check CHECK (office IS NULL OR office IN ('London', 'Accra', 'Windhoek'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
