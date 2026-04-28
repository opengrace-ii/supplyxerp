-- Add enabled_modules JSONB to persist module toggle state per tenant
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS enabled_modules JSONB NOT NULL DEFAULT '{}';
