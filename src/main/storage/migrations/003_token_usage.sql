-- Migration: 003_token_usage
-- Per-provider and per-model token consumption logs for monthly token budget calculation.

CREATE TABLE IF NOT EXISTS token_usage_logs (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  credential_id TEXT,
  model_id TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  token_source TEXT NOT NULL DEFAULT 'estimated',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_usage_logs_created_at ON token_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_logs_provider_model ON token_usage_logs(provider_id, model_id);
