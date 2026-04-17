-- Phase 3: MaterialHub Purchasing Suite

-- 1. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  currency CHAR(3) NOT NULL DEFAULT 'GBP',
  payment_terms_days INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- 2. Products Update
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS preferred_supplier_id BIGINT
  REFERENCES suppliers(id) ON DELETE SET NULL;

-- 3. Purchase Requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  pr_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED','CONVERTED')),
  required_by_date DATE,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_request_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  pr_id BIGINT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  estimated_price NUMERIC(18,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Overhaul Purchase Orders
-- (Drop existing minimal versions and recreate with full specs)
DROP TABLE IF EXISTS purchase_order_lines CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  po_number TEXT NOT NULL,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  pr_id BIGINT REFERENCES purchase_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','APPROVED','REJECTED',
                      'PARTIALLY_RECEIVED','RECEIVED','CANCELLED')),
  currency CHAR(3) NOT NULL DEFAULT 'GBP',
  total_value NUMERIC(18,2),
  expected_delivery_date DATE,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id),
  po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price NUMERIC(18,4) NOT NULL CHECK (unit_price >= 0),
  line_value NUMERIC(18,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  qty_received NUMERIC(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tenant Config Extensions
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS pr_number_format TEXT NOT NULL DEFAULT 'PR-{YEAR}-{SEQ}',
  ADD COLUMN IF NOT EXISTS pr_sequence_start BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS po_approval_threshold NUMERIC(18,2)
    NOT NULL DEFAULT 5000.00,
  ADD COLUMN IF NOT EXISTS po_approval_currency CHAR(3)
    NOT NULL DEFAULT 'GBP';
