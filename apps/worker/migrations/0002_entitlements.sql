-- Migration for existing databases (schema.sql covers fresh installs).
-- Apply with: wrangler d1 execute tonnta-alerts --remote --file=./migrations/0002_entitlements.sql
ALTER TABLE alert_subscriptions ADD COLUMN entitlement_email TEXT;

CREATE TABLE IF NOT EXISTS entitlements (
  email TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('annual', 'founder')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded')),
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  provider TEXT,
  provider_ref TEXT
);

CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
