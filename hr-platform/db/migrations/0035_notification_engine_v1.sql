-- ==============================================================================
-- Migration 0035: Notification Handling Mechanism v1.0
-- Implements event-driven, role-scoped, privacy-first notification pipeline:
--   - notification_events, notification_rules, notification_templates
--   - notification_inbox (canonical record with ESS/MSS/HRMS context)
--   - notification_deliveries (external channel adapters & idempotency)
--   - notification_preferences, notification_frequency_caps
--   - notification_unhandled_events
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notification_events (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id INTEGER NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  schema_version TEXT NOT NULL DEFAULT '1.0'
);

CREATE INDEX IF NOT EXISTS idx_notif_events_company_type
  ON notification_events (company_id, event_type, aggregate_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS notification_rules (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL DEFAULT 1,
  event_type TEXT NOT NULL,
  rule_version INT NOT NULL DEFAULT 1,
  recipient_resolver JSONB NOT NULL DEFAULT '{"role":"ACTOR"}'::jsonb,
  channels JSONB NOT NULL DEFAULT '["IN_APP"]'::jsonb,
  template_key TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  digest_policy TEXT NOT NULL DEFAULT 'IMMEDIATE' CHECK (digest_policy IN ('IMMEDIATE', 'DAILY_DIGEST', 'WEEKLY_DIGEST')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE NULL
);

CREATE TABLE IF NOT EXISTS notification_templates (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL DEFAULT 1,
  key TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  subject_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  version INT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notification_inbox (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  recipient_user_id INTEGER NOT NULL,
  event_id TEXT NULL,
  rule_id TEXT NULL,
  context TEXT NOT NULL DEFAULT 'ESS' CHECK (context IN ('ESS', 'MSS', 'HRMS')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT NOT NULL DEFAULT '/',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  read_at TIMESTAMPTZ NULL,
  dismissed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_inbox_recipient
  ON notification_inbox (company_id, recipient_user_id, dismissed_at, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_inbox_id TEXT NOT NULL REFERENCES notification_inbox(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SLACK', 'TEAMS', 'SMS')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED')),
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ NULL,
  external_id TEXT NULL,
  error_detail TEXT NULL,
  idempotency_key TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL DEFAULT '*',
  channels JSONB NOT NULL DEFAULT '["IN_APP","EMAIL"]'::jsonb,
  digest_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours JSONB NOT NULL DEFAULT '{"enabled":false,"from":"22:00","to":"07:00"}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_type)
);

CREATE TABLE IF NOT EXISTS notification_frequency_caps (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  window_minutes INT NOT NULL DEFAULT 60,
  max_count INT NOT NULL DEFAULT 10
);

CREATE TABLE IF NOT EXISTS notification_unhandled_events (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
