-- 010_document_completeness.sql
-- Mission: Document Data Model Completeness
-- Reference: erplite_document_data_model.md

-- 1A — Suppliers table completeness
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country CHAR(2) DEFAULT 'GB',
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_sort_code TEXT,
  ADD COLUMN IF NOT EXISTS incoterms TEXT DEFAULT 'EXW',
  ADD COLUMN IF NOT EXISTS incoterms_location TEXT,
  ADD COLUMN IF NOT EXISTS preferred_currency CHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS supplier_group TEXT DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS rating TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;

-- 1B — Purchase Requests table completeness
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS purchasing_group TEXT DEFAULT 'PG-01',
  ADD COLUMN IF NOT EXISTS cost_centre TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('NORMAL','URGENT','CRITICAL')),
  ADD COLUMN IF NOT EXISTS reference_doc TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejection_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_to_po_id BIGINT REFERENCES purchase_orders(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

ALTER TABLE purchase_request_lines
  ADD COLUMN IF NOT EXISTS line_number INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS short_text TEXT,
  ADD COLUMN IF NOT EXISTS required_by_date DATE,
  ADD COLUMN IF NOT EXISTS estimated_unit_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS line_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS preferred_supplier_id BIGINT REFERENCES suppliers(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_assignment_type CHAR(1) DEFAULT 'K',
  ADD COLUMN IF NOT EXISTS cost_centre TEXT,
  ADD COLUMN IF NOT EXISTS line_notes TEXT,
  ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (line_status IN ('OPEN','PARTIALLY_CONVERTED','CONVERTED','CANCELLED'));

-- 1C — Purchase Orders table completeness
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'STANDARD'
    CHECK (document_type IN ('STANDARD','CONSIGNMENT','SUBCONTRACT','FRAMEWORK')),
  ADD COLUMN IF NOT EXISTS document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS supplier_name_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS purchasing_org TEXT DEFAULT 'PO-01',
  ADD COLUMN IF NOT EXISTS purchasing_group TEXT DEFAULT 'PG-01',
  ADD COLUMN IF NOT EXISTS company_code TEXT DEFAULT '0001',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS payment_terms_days INT DEFAULT 30,
  ADD COLUMN IF NOT EXISTS incoterms TEXT DEFAULT 'EXW',
  ADD COLUMN IF NOT EXISTS incoterms_location TEXT,
  ADD COLUMN IF NOT EXISTS goods_receipt_expected BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invoice_expected BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_net_value NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gross_value NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rfq_id BIGINT,
  ADD COLUMN IF NOT EXISTS supplier_ref TEXT,
  ADD COLUMN IF NOT EXISTS delivery_address TEXT;

ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS line_number INT NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS short_text TEXT,
  ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS line_net_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS tax_code TEXT DEFAULT 'S0',
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_gross_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS receiving_zone_id BIGINT REFERENCES zones(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS overdelivery_tolerance_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS underdelivery_tolerance_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_assignment_type CHAR(1) DEFAULT 'K',
  ADD COLUMN IF NOT EXISTS cost_centre TEXT,
  ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC(18,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_notes TEXT,
  ADD COLUMN IF NOT EXISTS line_status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (line_status IN ('OPEN','PARTIALLY_RECEIVED','RECEIVED','CANCELLED'));

-- 1D — Goods Receipt table completeness
ALTER TABLE gr_documents
  ADD COLUMN IF NOT EXISTS document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT '101',
  ADD COLUMN IF NOT EXISTS fiscal_year INT,
  ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_note_number TEXT,
  ADD COLUMN IF NOT EXISTS bill_of_lading TEXT,
  ADD COLUMN IF NOT EXISTS reversal_of_gr_id BIGINT REFERENCES gr_documents(id)
    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_by BIGINT REFERENCES users(id)
    ON DELETE SET NULL;

ALTER TABLE gr_lines
  ADD COLUMN IF NOT EXISTS line_number INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS short_text TEXT,
  ADD COLUMN IF NOT EXISTS batch_ref TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS stock_type TEXT NOT NULL DEFAULT 'UNRESTRICTED'
    CHECK (stock_type IN ('UNRESTRICTED','QI_INSPECTION','BLOCKED')),
  ADD COLUMN IF NOT EXISTS movement_type TEXT DEFAULT '101',
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,4),
  ADD COLUMN IF NOT EXISTS line_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'GBP',
  ADD COLUMN IF NOT EXISTS line_notes TEXT;

-- 1E — Stock Adjustments completeness
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sa_number TEXT NOT NULL,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  adjustment_type TEXT NOT NULL DEFAULT 'COUNT_CORRECTION'
    CHECK (adjustment_type IN
      ('COUNT_CORRECTION','WRITE_OFF','FOUND_STOCK','DAMAGE','EXPIRY')),
  hu_id BIGINT REFERENCES handling_units(id) ON DELETE RESTRICT,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  zone_id BIGINT NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,
  site_id BIGINT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(18,4) NOT NULL,
  physical_count NUMERIC(18,4) NOT NULL,
  quantity_difference NUMERIC(18,4) GENERATED ALWAYS AS
    (physical_count - system_quantity) STORED,
  unit TEXT NOT NULL,
  reason_code TEXT,
  reason_text TEXT NOT NULL,
  counted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  posted_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  inventory_event_id BIGINT, -- Removed FK due to partitioned inventory_events
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_number_tenant
  ON stock_adjustments(tenant_id, sa_number);

-- 1F — Document number sequences (ensure all types exist)
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  SELECT 1, 'sa', 0 WHERE NOT EXISTS (
    SELECT 1 FROM tenant_sequences WHERE tenant_id=1 AND sequence_type='sa'
  );
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  SELECT 1, 'rfq', 0 WHERE NOT EXISTS (
    SELECT 1 FROM tenant_sequences WHERE tenant_id=1 AND sequence_type='rfq'
  );
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  SELECT 1, 'inv', 0 WHERE NOT EXISTS (
    SELECT 1 FROM tenant_sequences WHERE tenant_id=1 AND sequence_type='inv'
  );
INSERT INTO tenant_sequences (tenant_id, sequence_type, current_val)
  SELECT 1, 'tr', 0 WHERE NOT EXISTS (
    SELECT 1 FROM tenant_sequences WHERE tenant_id=1 AND sequence_type='tr'
  );

-- Add number format columns for new doc types
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS sa_number_format TEXT NOT NULL
    DEFAULT 'SA-{YEAR}-{SEQ}',
  ADD COLUMN IF NOT EXISTS rfq_number_format TEXT NOT NULL
    DEFAULT 'RFQ-{YEAR}-{SEQ}',
  ADD COLUMN IF NOT EXISTS inv_number_format TEXT NOT NULL
    DEFAULT 'INV-{YEAR}-{SEQ}',
  ADD COLUMN IF NOT EXISTS tr_number_format TEXT NOT NULL
    DEFAULT 'TR-{YEAR}-{SEQ}';
