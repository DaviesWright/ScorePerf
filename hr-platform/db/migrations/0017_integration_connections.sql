-- Integration connections: one record per provider per company. secret_refs maps a slot (for example clientSecret) to the
-- name of a Cloudflare Worker secret (for example BC_CLIENT_SECRET). Secret values are never stored here.
-- Idempotent. NOT applied to any database yet: review, then apply by hand (db/schema.sql mirrors this file).

CREATE TABLE IF NOT EXISTS integration_connections (
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL
        CONSTRAINT integration_connections_provider_check CHECK (provider IN ('business_central', 'seamless_hr', 'clay_hr', 'coursera')),
    label VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    base_url TEXT NOT NULL DEFAULT '',
    secret_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (company_id, provider)
);
