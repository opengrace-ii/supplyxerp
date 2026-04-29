-- SupplyXERP Migration 037: Goods Issue Documents, Stock Reservations, GR Enhancements
-- Session A: Inventory Management Gap Closure
-- Reference: SAP S/4HANA IM, Chapter 6 (Core Inventory) + Chapter 7 (Production Execution)

-- ============================================================
-- 1. GI DOCUMENTS (mirror of gr_documents for outbound stock)
-- ============================================================
CREATE TABLE IF NOT EXISTS gi_documents (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,  -- tenant isolation
  public_id       UUID DEFAULT gen_random_uuid(),
  organisation_id BIGINT NOT NULL DEFAULT 0,  -- resolved from zone → site → org
  site_id         BIGINT NOT NULL DEFAULT 0,
  zone_id         BIGINT NOT NULL REFERENCES zones(id) ON DELETE RESTRICT,   -- source zone
  gi_number       TEXT NOT NULL,               -- GI-{YEAR}-{SEQ}
  status          TEXT NOT NULL DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','POSTED','CANCELLED','REVERSED')),
  document_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  posting_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  movement_type   TEXT NOT NULL DEFAULT '261',  -- 261=Production, 551=Scrap, 601=Sales
  fiscal_year     INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  reason_code     TEXT,                         -- e.g. DAMAGED, EXPIRED, SAMPLING
  reason_text     TEXT,                         -- free-text reason
  cost_centre     TEXT,                         -- for accounting integration
  reference_type  TEXT,                         -- BUILD_ORDER, SALES_ORDER, MANUAL
  reference_id    BIGINT,                       -- FK to the source document
  notes           TEXT,
  posted_at       TIMESTAMPTZ,
  posted_by       BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, gi_number)
);
CREATE INDEX IF NOT EXISTS idx_gi_documents_tenant ON gi_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gi_documents_status ON gi_documents(tenant_id, status);

-- ============================================================
-- 2. GI LINES (items within a GI document)
-- ============================================================
CREATE TABLE IF NOT EXISTS gi_lines (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id       UUID DEFAULT gen_random_uuid(),
  gi_document_id  BIGINT NOT NULL REFERENCES gi_documents(id) ON DELETE CASCADE,
  line_number     INT NOT NULL DEFAULT 1,
  product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  short_text      TEXT,
  quantity        NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  unit            TEXT NOT NULL,
  batch_ref       TEXT,
  stock_type      TEXT NOT NULL DEFAULT 'UNRESTRICTED',
  movement_type   TEXT NOT NULL DEFAULT '261',
  hu_id           BIGINT REFERENCES handling_units(id) ON DELETE SET NULL,
  line_notes      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gi_lines_document ON gi_lines(gi_document_id);

-- ============================================================
-- 3. STOCK RESERVATIONS
-- available_qty = unrestricted_qty - reserved_qty
-- Prevents overselling (DealFlow) and over-commitment (BuildOrder)
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_reservations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id       UUID DEFAULT gen_random_uuid(),
  reservation_number TEXT NOT NULL,             -- RES-{YEAR}-{SEQ}
  product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  site_id         BIGINT NOT NULL DEFAULT 0,
  zone_id         BIGINT REFERENCES zones(id) ON DELETE SET NULL,
  quantity        NUMERIC(18,4) NOT NULL CHECK (quantity > 0),
  fulfilled_qty   NUMERIC(18,4) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL,
  movement_type   TEXT NOT NULL DEFAULT '261',   -- what GI type will fulfil this
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','FULFILLED','CANCELLED','EXPIRED')),
  reserved_by_type TEXT NOT NULL DEFAULT 'MANUAL',   -- BUILD_ORDER, SALES_ORDER, MANUAL
  reserved_by_id  BIGINT,                            -- FK to build_orders/sales_orders
  requirement_date DATE,                             -- when the material is needed
  valid_until     DATE,                              -- auto-expire after this date
  cost_centre     TEXT,
  notes           TEXT,
  created_by      BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, reservation_number)
);
CREATE INDEX IF NOT EXISTS idx_reservations_product ON stock_reservations(tenant_id, product_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_ref ON stock_reservations(reserved_by_type, reserved_by_id);

-- ============================================================
-- 4. ADD reference_type TO gr_documents (GR Without Reference)
-- ============================================================
ALTER TABLE gr_documents
  ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT 'PO',          -- PO, PRODUCTION_ORDER, NONE
  ADD COLUMN IF NOT EXISTS reference_id BIGINT,                       -- FK to the source doc (nullable for NONE)
  ADD COLUMN IF NOT EXISTS movement_type TEXT DEFAULT '101',          -- 101=GR from PO, 501=Initial Entry, 531=Production
  ADD COLUMN IF NOT EXISTS document_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS posting_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS fiscal_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_note_number TEXT,
  ADD COLUMN IF NOT EXISTS bill_of_lading TEXT;

-- ============================================================
-- 5. Add GI event type to inventory_events CHECK constraint
-- ============================================================
-- Note: The existing CHECK constraint on event_type already includes 'GI'
-- so no alteration needed.

-- ============================================================
-- 6. Update stock views to include reserved quantities
-- ============================================================

-- v_product_stock_summary: add reserved_qty and available_qty
CREATE OR REPLACE VIEW v_product_stock_summary AS
SELECT
  p.tenant_id,
  p.id AS product_id,
  p.code AS product_code,
  p.name AS product_name,
  p.base_unit,
  COALESCE(stock.total_quantity, 0) AS total_quantity,
  COALESCE(stock.total_hu_count, 0) AS total_hu_count,
  COALESCE(stock.zone_count, 0) AS zone_count,
  stock.last_movement_at,
  COALESCE(res.reserved_qty, 0) AS reserved_qty,
  COALESCE(stock.total_quantity, 0) - COALESCE(res.reserved_qty, 0) AS available_qty
FROM products p
LEFT JOIN LATERAL (
  SELECT
    SUM(hu.quantity) AS total_quantity,
    COUNT(hu.id) AS total_hu_count,
    COUNT(DISTINCT hu.zone_id) AS zone_count,
    MAX(ie.created_at) AS last_movement_at
  FROM handling_units hu
  LEFT JOIN inventory_events ie ON ie.hu_id = hu.id
  WHERE hu.product_id = p.id
    AND hu.tenant_id = p.tenant_id
    AND hu.status = 'IN_STOCK'
    AND hu.stock_type = 'UNRESTRICTED'
) stock ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(r.quantity - r.fulfilled_qty), 0) AS reserved_qty
  FROM stock_reservations r
  WHERE r.product_id = p.id
    AND r.tenant_id = p.tenant_id
    AND r.status = 'ACTIVE'
) res ON true;
