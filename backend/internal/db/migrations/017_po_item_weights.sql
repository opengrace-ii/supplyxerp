-- ============================================================
-- SupplyXERP Migration 017 — PO Document Enrichment (CORRECTED)
-- ============================================================

BEGIN;

-- 1. Enrich purchase_orders header
ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS collective_no        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS header_text          TEXT,
    ADD COLUMN IF NOT EXISTS delivery_terms_text  TEXT,
    ADD COLUMN IF NOT EXISTS warranty_text        TEXT,
    ADD COLUMN IF NOT EXISTS penalty_text         TEXT,
    ADD COLUMN IF NOT EXISTS guarantee_text       TEXT,
    ADD COLUMN IF NOT EXISTS incoterms_version    VARCHAR(4),
    ADD COLUMN IF NOT EXISTS incoterms_location1  VARCHAR(70),
    ADD COLUMN IF NOT EXISTS incoterms_location2  VARCHAR(70),
    ADD COLUMN IF NOT EXISTS goods_supplier_id    BIGINT REFERENCES suppliers(id),
    ADD COLUMN IF NOT EXISTS invoicing_party_id   BIGINT REFERENCES suppliers(id),
    ADD COLUMN IF NOT EXISTS fixed_exch_rate      BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS output_sent          BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS output_sent_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS output_medium        VARCHAR(1) DEFAULT '1',
    ADD COLUMN IF NOT EXISTS down_payment_pct     NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS down_payment_amt     NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS down_payment_due     DATE;

-- 2. Enrich purchase_order_lines (the actual table name for PO items)
ALTER TABLE purchase_order_lines
    -- Block / Delete
    ADD COLUMN IF NOT EXISTS blocked              BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS block_reason_code    VARCHAR(2),
    ADD COLUMN IF NOT EXISTS blocked_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS blocked_by           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted              BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by           VARCHAR(100),
    
    -- Category & Batch
    ADD COLUMN IF NOT EXISTS acct_assgt_cat       VARCHAR(2),
    ADD COLUMN IF NOT EXISTS item_category        VARCHAR(2) DEFAULT 'L',
    ADD COLUMN IF NOT EXISTS supplier_batch       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS internal_batch       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS serial_no_profile    VARCHAR(10),
    
    -- Texts
    ADD COLUMN IF NOT EXISTS item_text            TEXT,
    ADD COLUMN IF NOT EXISTS info_record_text     TEXT,
    ADD COLUMN IF NOT EXISTS delivery_text        TEXT,
    
    -- Address Override
    ADD COLUMN IF NOT EXISTS delivery_addr_diff   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_addr_street VARCHAR(100),
    ADD COLUMN IF NOT EXISTS delivery_addr_city   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_addr_zip    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_addr_country VARCHAR(3),
    
    -- UOM & Conversion
    ADD COLUMN IF NOT EXISTS base_uom             VARCHAR(6),
    ADD COLUMN IF NOT EXISTS order_uom            VARCHAR(6),
    ADD COLUMN IF NOT EXISTS uom_conversion_num   NUMERIC(12,5) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS uom_conversion_den   NUMERIC(12,5) DEFAULT 1,
    
    -- Weights & Volume (Phase 2)
    ADD COLUMN IF NOT EXISTS gross_weight         NUMERIC(15,3),
    ADD COLUMN IF NOT EXISTS net_weight           NUMERIC(15,3),
    ADD COLUMN IF NOT EXISTS weight_unit          VARCHAR(6),
    ADD COLUMN IF NOT EXISTS volume               NUMERIC(15,3),
    ADD COLUMN IF NOT EXISTS volume_unit          VARCHAR(6);

-- 3. Block reasons master
CREATE TABLE IF NOT EXISTS po_block_reasons (
    code        VARCHAR(2) PRIMARY KEY,
    description VARCHAR(80) NOT NULL
);

INSERT INTO po_block_reasons (code, description) VALUES
    ('01', 'Quality issue with received material'),
    ('02', 'Price dispute'),
    ('03', 'Supplier performance issue'),
    ('04', 'Pending approval'),
    ('05', 'Legal hold'),
    ('06', 'Duplicate order suspect'),
    ('07', 'Material specification change'),
    ('08', 'Budget freeze'),
    ('09', 'Force majeure'),
    ('10', 'Import clearance pending')
ON CONFLICT DO NOTHING;

-- 4. Foreign key for block reasons
ALTER TABLE purchase_order_lines
    DROP CONSTRAINT IF EXISTS fk_poi_block_reason;

ALTER TABLE purchase_order_lines
    ADD CONSTRAINT fk_poi_block_reason
    FOREIGN KEY (block_reason_code) REFERENCES po_block_reasons(code)
    ON UPDATE CASCADE;

COMMIT;
