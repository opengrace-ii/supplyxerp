-- Migration 032: GR Stock Engine + Over-Delivery Guard

-- 1. Ensure stock_type enum is comprehensive
DO $$ BEGIN
  CREATE TYPE stock_type_enum AS ENUM (
    'UNRESTRICTED', 'QI_INSPECTION', 'BLOCKED', 'IN_PROCESS', 'IN_TRANSIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add stock_type to inventory_events if not already present
ALTER TABLE inventory_events
  ADD COLUMN IF NOT EXISTS stock_type TEXT NOT NULL DEFAULT 'UNRESTRICTED';

-- 3. Add stock_type to handling_units if not present
ALTER TABLE handling_units
  ADD COLUMN IF NOT EXISTS stock_type TEXT NOT NULL DEFAULT 'UNRESTRICTED';

-- 4. Over-delivery config per PO line (using purchase_order_lines as per current schema)
ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS overdelivery_requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS overdelivery_approved_by BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS overdelivery_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS overdelivery_approval_note TEXT;

-- 5. GR over-delivery hold table
CREATE TABLE IF NOT EXISTS gr_overdelivery_holds (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id),
  public_id         UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  gr_id             BIGINT NOT NULL REFERENCES gr_documents(id),
  po_line_id        BIGINT NOT NULL REFERENCES purchase_order_lines(id),
  po_quantity       NUMERIC(15,3) NOT NULL,
  received_quantity NUMERIC(15,3) NOT NULL,
  excess_quantity   NUMERIC(15,3) GENERATED ALWAYS AS (received_quantity - po_quantity) STORED,
  excess_pct        NUMERIC(8,4)  GENERATED ALWAYS AS (
    CASE WHEN po_quantity = 0 THEN 0 
    ELSE ((received_quantity - po_quantity) / po_quantity * 100) 
    END
  ) STORED,
  status            TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | APPROVED | REJECTED
  requested_by      BIGINT NOT NULL REFERENCES users(id),
  approved_by       BIGINT REFERENCES users(id),
  resolved_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gr_holds_tenant_status
  ON gr_overdelivery_holds(tenant_id, status);

-- 6. Product QC Policy
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS qc_on_gr    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qc_on_output BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gr_default_stock_type TEXT NOT NULL DEFAULT 'UNRESTRICTED';
