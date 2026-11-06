-- Leave decisions: when the request was decided, and the reason. A rejection must carry a reason (enforced in the API;
-- the column stays nullable for pending and approved requests). Idempotent.

ALTER TABLE leave_requests
    ADD COLUMN IF NOT EXISTS decision_comment TEXT,
    ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
