-- Phase 3: Session A - Pricing Engine and RFQ Foundation

-- 1. Configuration Extensions
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS approval_mode TEXT NOT NULL DEFAULT 'FLAT' CHECK (approval_mode IN ('FLAT', 'MRP_BASED')),
  ADD COLUMN IF NOT EXISTS flat_pr_threshold NUMERIC(18,2) NOT NULL DEFAULT 500.00,
  ADD COLUMN IF NOT EXISTS flat_po_threshold NUMERIC(18,2) NOT NULL DEFAULT 5000.00,
  ADD COLUMN IF NOT EXISTS default_tolerance_pct NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS default_currency CHAR(3) NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS condition_types_seeded BOOLEAN NOT NULL DEFAULT false;

-- Add IR numbers requirement
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  SELECT 1, 'ir', 0 WHERE NOT EXISTS (
    SELECT 1 FROM tenant_sequences WHERE tenant_id=1 AND sequence_type='ir'
  );

ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS ir_number_format TEXT NOT NULL DEFAULT 'IR-{YEAR}-{SEQ}';

-- 1b. Product master pricing extensions
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS price_control TEXT NOT NULL DEFAULT 'FLEXIBLE' CHECK (price_control IN ('FLEXIBLE', 'STANDARD', 'MAP')),
  ADD COLUMN IF NOT EXISTS standard_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS standard_price_unit NUMERIC(18,4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS standard_currency CHAR(3) NOT NULL DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS map_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS last_po_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS last_po_date DATE,
  ADD COLUMN IF NOT EXISTS auto_approve_tolerance_pct NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS requires_quotation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reorder_point NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS safety_stock NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS max_stock_level NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS procurement_type TEXT NOT NULL DEFAULT 'EXTERNAL' CHECK (procurement_type IN ('EXTERNAL', 'INTERNAL', 'BOTH'));

-- 2. Pricing Engine Definitions
CREATE TABLE IF NOT EXISTS condition_types (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  condition_class TEXT NOT NULL CHECK (condition_class IN ('PRICE', 'DISCOUNT', 'SURCHARGE', 'FREIGHT', 'TAX')),
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('FIXED_AMOUNT', 'PERCENTAGE', 'QUANTITY', 'SUBTOTAL')),
  plus_minus TEXT NOT NULL DEFAULT 'POSITIVE' CHECK (plus_minus IN ('POSITIVE', 'NEGATIVE')),
  base_step INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS calculation_schemas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS calculation_schema_steps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schema_id BIGINT NOT NULL REFERENCES calculation_schemas(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  condition_type_id BIGINT REFERENCES condition_types(id) ON DELETE RESTRICT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_statistical BOOLEAN NOT NULL DEFAULT false,
  subtotal_flag TEXT, -- e.g., 'S1', 'S2' for storing specific subtotals
  UNIQUE(schema_id, step_number)
);

CREATE TABLE IF NOT EXISTS access_sequences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS access_sequence_steps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  access_sequence_id BIGINT NOT NULL REFERENCES access_sequences(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  table_name TEXT NOT NULL, -- e.g., 'pricing_condition_records', 'purchasing_info_records'
  UNIQUE(access_sequence_id, step_number)
);

-- Link condition types to access sequences
ALTER TABLE condition_types 
  ADD COLUMN IF NOT EXISTS access_sequence_id BIGINT REFERENCES access_sequences(id) ON DELETE SET NULL;

-- 3. Pricing Condition Records
CREATE TABLE IF NOT EXISTS pricing_condition_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id UUID DEFAULT gen_random_uuid(),
  condition_type_id BIGINT NOT NULL REFERENCES condition_types(id) ON DELETE CASCADE,
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  purchasing_org TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  rate_amount NUMERIC(18,4) NOT NULL,
  currency CHAR(3),
  pricing_unit NUMERIC(18,4) DEFAULT 1,
  uom TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Product Price History (Inventory Valuation)
CREATE TABLE IF NOT EXISTS product_price_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_type TEXT NOT NULL CHECK (price_type IN ('STANDARD', 'MAP')),
  price NUMERIC(18,4) NOT NULL CHECK (price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'GBP',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  changed_by_username TEXT, -- denormalized or can use ID
  change_reason TEXT,
  source_document TEXT, -- e.g. PO number
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Purchasing Info Records
CREATE TABLE IF NOT EXISTS purchasing_info_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id UUID DEFAULT gen_random_uuid(),
  info_record_number TEXT NOT NULL,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  purchasing_org TEXT,
  supplier_material_num TEXT,
  planned_delivery_time_days INT,
  standard_qty NUMERIC(18,4),
  minimum_qty NUMERIC(18,4),
  max_order_quantity NUMERIC(18,4),
  overdelivery_tolerance_pct NUMERIC(5,2),
  underdelivery_tolerance_pct NUMERIC(5,2),
  auto_approve_below NUMERIC(18,2),
  requires_quotation BOOLEAN NOT NULL DEFAULT false,
  net_price NUMERIC(18,4), 
  currency CHAR(3),
  per_quantity NUMERIC(18,4) DEFAULT 1,
  per_unit TEXT,
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, info_record_number),
  UNIQUE(tenant_id, supplier_id, product_id, site_id, purchasing_org)
);

-- 6. RFQ Suite
CREATE TABLE IF NOT EXISTS rfq_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id UUID DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED')),
  purchasing_org TEXT,
  purchasing_group TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  deadline_date DATE NOT NULL,
  notes TEXT,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, rfq_number)
);

CREATE TABLE IF NOT EXISTS rfq_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rfq_id BIGINT NOT NULL REFERENCES rfq_documents(id) ON DELETE CASCADE,
  line_number INT NOT NULL DEFAULT 10,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  short_text TEXT,
  quantity NUMERIC(18,4) NOT NULL,
  unit TEXT NOT NULL,
  delivery_date DATE,
  receiving_zone_id BIGINT REFERENCES zones(id) ON DELETE SET NULL,
  UNIQUE(rfq_id, line_number)
);

CREATE TABLE IF NOT EXISTS rfq_suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rfq_id BIGINT NOT NULL REFERENCES rfq_documents(id) ON DELETE CASCADE,
  supplier_id BIGINT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NOTIFIED', 'RESPONDED', 'DECLINED')),
  notified_at TIMESTAMPTZ,
  UNIQUE(rfq_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS rfq_quotes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id UUID DEFAULT gen_random_uuid(),
  rfq_supplier_id BIGINT NOT NULL REFERENCES rfq_suppliers(id) ON DELETE CASCADE,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_to DATE,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED')),
  total_value NUMERIC(18,2),
  currency CHAR(3) NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quotes link back to RFQ lines with supplier's bid
CREATE TABLE IF NOT EXISTS rfq_quote_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id BIGINT NOT NULL REFERENCES rfq_quotes(id) ON DELETE CASCADE,
  rfq_line_id BIGINT NOT NULL REFERENCES rfq_lines(id) ON DELETE CASCADE,
  quantity_offered NUMERIC(18,4) NOT NULL,
  unit_price NUMERIC(18,4) NOT NULL,
  delivery_date_offered DATE,
  notes TEXT,
  UNIQUE(quote_id, rfq_line_id)
);
-- 7. Governance and Traceability Extensions
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS decision_factor TEXT,
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS decision_factor TEXT,
  ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;
