-- Home page content: staff announcements and birthdays.
--
-- employees.date_of_birth is nullable; birthdays only show for people whose date HR has entered.
-- announcements are posted by hr_admin (enforced in the API). An announcement is visible from published_on
-- until expires_on (inclusive); NULL expires_on means no expiry.
--
-- Idempotent.

ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    published_on DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_on DATE,
    created_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT announcements_dates_check CHECK (expires_on IS NULL OR expires_on >= published_on)
);

CREATE INDEX IF NOT EXISTS idx_announcements_company_dates ON announcements(company_id, published_on, expires_on);
