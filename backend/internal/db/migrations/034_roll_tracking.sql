-- Roll / Serial number tracking on Handling Units
-- Allows a single GR to fan out into N individual HUs (one per roll).
-- Each roll gets a unique serial_number = "{roll_prefix}-{zero-padded sequence}"

ALTER TABLE handling_units
  ADD COLUMN IF NOT EXISTS serial_number  VARCHAR(50),
  ADD COLUMN IF NOT EXISTS roll_prefix    VARCHAR(30),
  ADD COLUMN IF NOT EXISTS roll_sequence  INT;

-- Serial numbers must be globally unique within a tenant (when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_hu_serial_tenant
  ON handling_units(tenant_id, serial_number)
  WHERE serial_number IS NOT NULL;
