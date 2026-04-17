-- Tenant Configuration
-- All per-tenant operational settings in one table.
-- One row per tenant. Created by auto-provisioning alongside org/site/zones.

CREATE TABLE IF NOT EXISTS tenant_config (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id             BIGINT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  -- Number sequence overrides (client sets these to continue from legacy system)
  gr_sequence_start     BIGINT NOT NULL DEFAULT 1,
  po_sequence_start     BIGINT NOT NULL DEFAULT 1,
  hu_sequence_start     BIGINT NOT NULL DEFAULT 1,
  so_sequence_start     BIGINT NOT NULL DEFAULT 1,

  -- Number format templates
  gr_number_format      TEXT NOT NULL DEFAULT 'GR-{YEAR}-{SEQ}',
  po_number_format      TEXT NOT NULL DEFAULT 'PO-{YEAR}-{SEQ}',
  hu_code_format        TEXT NOT NULL DEFAULT 'HU-{YEAR}-{SEQ}',
  so_number_format      TEXT NOT NULL DEFAULT 'SO-{YEAR}-{SEQ}',

  -- Domain profile
  domain_profile        TEXT NOT NULL DEFAULT 'GENERAL'
                          CHECK (domain_profile IN (
                            'GENERAL', 'MANUFACTURING', 'DISTRIBUTION', 'RETAIL', 
                            'PHARMA', 'TEXTILE', 'CONSTRUCTION', 'FOOD'
                          )),

  -- Operational defaults
  default_currency      CHAR(3) NOT NULL DEFAULT 'USD',
  default_timezone      TEXT NOT NULL DEFAULT 'UTC',
  default_uom           TEXT NOT NULL DEFAULT 'QTY',
  batch_tracking        BOOLEAN NOT NULL DEFAULT false,
  expiry_tracking       BOOLEAN NOT NULL DEFAULT false,
  serial_tracking       BOOLEAN NOT NULL DEFAULT false,
  qc_on_receipt         BOOLEAN NOT NULL DEFAULT false,
  fifo_enforced         BOOLEAN NOT NULL DEFAULT false,

  -- Migration state
  migration_completed   BOOLEAN NOT NULL DEFAULT false,
  migration_completed_at TIMESTAMPTZ,
  go_live_date          DATE,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration of existing sequence values
-- This ensures that for existing tenants, the sequence starts after their last document.
INSERT INTO tenant_config (tenant_id, gr_sequence_start, hu_sequence_start)
SELECT 
    t.id,
    COALESCE((SELECT MAX(substring(gr_number from '[0-9]+$')::BIGINT) FROM gr_documents WHERE tenant_id = t.id), 0) + 1,
    COALESCE((SELECT MAX(substring(entity_id::text from '[0-9]+$')::BIGINT) FROM barcodes WHERE tenant_id = t.id AND entity_type = 'HU'), 0) + 1
FROM tenants t
ON CONFLICT (tenant_id) DO NOTHING;

-- Ensure all tenants have a config row
INSERT INTO tenant_config (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
