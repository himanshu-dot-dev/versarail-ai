-- Migration: 002_provider_health
-- Persistent health ledger, strikes, and cooldowns for auto-switching free model mesh

CREATE TABLE IF NOT EXISTS provider_health (
  key_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model_id TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  strikes INTEGER NOT NULL DEFAULT 0,
  cooldown_until INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_used_at INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_health_status ON provider_health(status);
CREATE INDEX IF NOT EXISTS idx_provider_health_provider ON provider_health(provider_id);

