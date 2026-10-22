-- Alert subscriptions: one row per browser push subscription. The endpoint
-- is the identity — no accounts in v1. `entitlement_email` links a device to
-- a Pro purchase (see entitlements) after a magic-link restore.
CREATE TABLE IF NOT EXISTS alert_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  spot_id TEXT NOT NULL DEFAULT 'donabate',
  min_wave_m REAL NOT NULL DEFAULT 0.4,
  max_wind_kmh REAL NOT NULL DEFAULT 25,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_alerted_at TEXT,
  entitlement_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_subscriptions_spot ON alert_subscriptions (spot_id);

-- Pro purchases, keyed by checkout email (no accounts). expires_at is NULL
-- for founder lifetime purchases.
CREATE TABLE IF NOT EXISTS entitlements (
  email TEXT PRIMARY KEY,
  tier TEXT NOT NULL CHECK (tier IN ('annual', 'founder')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'refunded')),
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  provider TEXT,
  provider_ref TEXT
);

-- Single-use magic-link tokens for restoring a purchase on a new device.
CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
