-- Half-day leave: a request for one working day counted as 0.5, in the morning or the afternoon.
-- NULL means a full-day (or multi-day) request. The rules (same start and end date, a working day) are enforced in
-- packages/shared and checked again by the API. Idempotent.

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS half_day_period VARCHAR(10);

DO $$ BEGIN
    ALTER TABLE leave_requests
        ADD CONSTRAINT leave_requests_half_day_check CHECK (half_day_period IS NULL OR half_day_period IN ('morning', 'afternoon'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
