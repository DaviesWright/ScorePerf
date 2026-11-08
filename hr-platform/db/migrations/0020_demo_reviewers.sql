-- Demo reviewers: people given the demo persona picker. Captured on the sign-in screen (no account, no email).
-- Idempotent. NOT applied to any database yet. Apply after review.

CREATE TABLE IF NOT EXISTS demo_reviewers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    company VARCHAR(160) NOT NULL,
    job_title VARCHAR(120) NOT NULL DEFAULT '',
    phone VARCHAR(40) NOT NULL DEFAULT '',
    note VARCHAR(500) NOT NULL DEFAULT '',
    first_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    visit_count INTEGER DEFAULT 1 NOT NULL CHECK (visit_count >= 1)
);
