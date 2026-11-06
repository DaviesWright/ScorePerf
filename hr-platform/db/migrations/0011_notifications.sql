-- In-app notifications. Leave and trip events go to the employee's solid manager and to HR. Email needs a mail
-- provider, which is not configured, so notifications are shown in the app. Idempotent.

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
