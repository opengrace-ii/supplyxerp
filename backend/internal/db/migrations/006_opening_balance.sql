-- Add OPENING_BALANCE as a valid inventory event type
-- This is how legacy stock enters the ledger without bypassing it.
-- Also adds SITE_TRANSFER, DISPATCH, and RETURN types.

-- First, ensure a check constraint exists or create it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_events_event_type_check') THEN
        ALTER TABLE inventory_events
        ADD CONSTRAINT inventory_events_event_type_check
        CHECK (event_type IN (
          'OPENING_BALANCE',
          'GR',
          'PUTAWAY',
          'MOVE',
          'CONSUME',
          'SPLIT',
          'MERGE',
          'RELABEL',
          'ADJUST',
          'SITE_TRANSFER',
          'DISPATCH',
          'RETURN'
        ));
    END IF;
END $$;

-- Opening balance import batch tracker
CREATE TABLE IF NOT EXISTS opening_balance_imports (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id     UUID DEFAULT gen_random_uuid(),
  import_date   DATE NOT NULL,         -- the as-of date for the opening balance
  total_lines   INT NOT NULL DEFAULT 0,
  posted_lines  INT NOT NULL DEFAULT 0,
  failed_lines  INT NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('PENDING','PROCESSING','COMPLETED','PARTIAL','FAILED')),
  error_log     JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure index for tenant performance
CREATE INDEX IF NOT EXISTS idx_ob_imports_tenant ON opening_balance_imports(tenant_id);
