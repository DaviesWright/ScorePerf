-- Corporate strategy goals, loaded from a CSV by HR (see packages/shared/src/strategy.ts for the format).
-- A load replaces the company's whole strategy in one transaction, so the table always matches the last good file.
-- Idempotent.

CREATE TABLE IF NOT EXISTS corporate_strategy_goals (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    perspective VARCHAR(100) NOT NULL,
    objective VARCHAR(255) NOT NULL,
    measure VARCHAR(255) NOT NULL,
    target NUMERIC(14, 2) NOT NULL CHECK (target >= 0),
    owner VARCHAR(100),
    weight NUMERIC(5, 2) CHECK (weight IS NULL OR (weight > 0 AND weight <= 100)),
    loaded_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    loaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_corporate_strategy_company ON corporate_strategy_goals(company_id);
