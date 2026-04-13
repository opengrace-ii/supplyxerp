-- ERPLite Goods Receipt & Sequencing
-- Adds tenant_sequences for SaaS isolation
-- Adds gr_documents and gr_lines for inbound tracking

-- TENANT SEQUENCES
-- Replaces global sequences with per-tenant counters to prevent info leakage
CREATE TABLE IF NOT EXISTS tenant_sequences (
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL,      -- 'GR', 'HU', 'PO', etc.
  current_val   BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, sequence_type)
);

-- Function to get the next sequence value for a tenant
CREATE OR REPLACE FUNCTION get_next_sequence(p_tenant_id BIGINT, p_type TEXT)
RETURNS BIGINT LANGUAGE plpgsql AS $$
DECLARE
  v_val BIGINT;
BEGIN
  INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  VALUES (p_tenant_id, p_type, 1)
  ON CONFLICT (tenant_id, sequence_type)
  DO UPDATE SET current_val = tenant_sequences.current_val + 1, updated_at = now()
  RETURNING current_val INTO v_val;
  
  RETURN v_val;
END;
$$;

-- GR DOCUMENTS
CREATE TABLE IF NOT EXISTS gr_documents (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id       UUID DEFAULT gen_random_uuid(),
  organisation_id BIGINT NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  site_id         BIGINT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  zone_id         BIGINT NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  gr_number       TEXT NOT NULL,      -- GR-{YEAR}-{TENANT_SEQ}
  status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','POSTED','CANCELLED')),
  supplier_ref    TEXT,
  notes           TEXT,
  posted_at       TIMESTAMPTZ,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, gr_number)
);
CREATE INDEX idx_gr_documents_tenant ON gr_documents(tenant_id);

-- GR LINES
CREATE TABLE IF NOT EXISTS gr_lines (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id       UUID DEFAULT gen_random_uuid(),
  gr_document_id  BIGINT NOT NULL REFERENCES gr_documents(id) ON DELETE CASCADE,
  product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity        NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL,
  batch_ref       TEXT,
  hu_id           BIGINT REFERENCES handling_units(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gr_lines_document ON gr_lines(gr_document_id);
