-- ============================================================
-- SupplyXERP Migration 016 — Purchase Order Document Enrich
-- Phase 1: Full SAP Chapter-10 PO completeness
-- ============================================================

BEGIN;

-- ── 1. Enrich purchase_orders header ──────────────────────────
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
    ADD COLUMN IF NOT EXISTS payment_processing   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS down_payment_pct     NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS down_payment_amt     NUMERIC(18,2),
    ADD COLUMN IF NOT EXISTS down_payment_due     DATE,
    ADD COLUMN IF NOT EXISTS fixed_exch_rate      BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS output_sent          BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS output_sent_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS output_medium        VARCHAR(1) DEFAULT '1';

COMMENT ON COLUMN purchase_orders.collective_no       IS 'External reference number – used to link legacy POs';
COMMENT ON COLUMN purchase_orders.goods_supplier_id   IS 'Partner function GS – may differ from invoicing party';
COMMENT ON COLUMN purchase_orders.invoicing_party_id  IS 'Partner function IP – may differ from goods supplier';

-- ── 2. Enrich purchase_order_lines ────────────────────────────
ALTER TABLE purchase_order_lines
    ADD COLUMN IF NOT EXISTS item_no              INT,
    ADD COLUMN IF NOT EXISTS blocked              BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS block_reason_code    VARCHAR(2),
    ADD COLUMN IF NOT EXISTS blocked_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS blocked_by           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS deleted              BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by           VARCHAR(100),
    ADD COLUMN IF NOT EXISTS acct_assgt_cat       VARCHAR(2),
    ADD COLUMN IF NOT EXISTS item_category        VARCHAR(2) DEFAULT 'L',
    ADD COLUMN IF NOT EXISTS supplier_batch       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS internal_batch       VARCHAR(30),
    ADD COLUMN IF NOT EXISTS serial_no_profile    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS item_text            TEXT,
    ADD COLUMN IF NOT EXISTS info_record_text     TEXT,
    ADD COLUMN IF NOT EXISTS delivery_text        TEXT,
    ADD COLUMN IF NOT EXISTS delivery_addr_diff   BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS delivery_addr_street VARCHAR(100),
    ADD COLUMN IF NOT EXISTS delivery_addr_city   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_addr_zip    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_addr_country VARCHAR(3),
    ADD COLUMN IF NOT EXISTS base_uom             VARCHAR(6),
    ADD COLUMN IF NOT EXISTS order_uom            VARCHAR(6),
    ADD COLUMN IF NOT EXISTS uom_conversion_num   NUMERIC(12,5) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS uom_conversion_den   NUMERIC(12,5) DEFAULT 1,
    ADD COLUMN IF NOT EXISTS net_price            NUMERIC(18,4),
    ADD COLUMN IF NOT EXISTS order_unit           VARCHAR(6),
    ADD COLUMN IF NOT EXISTS material_id          BIGINT REFERENCES products(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS short_text           TEXT,
    ADD COLUMN IF NOT EXISTS plant                VARCHAR(10),
    ADD COLUMN IF NOT EXISTS storage_location     VARCHAR(10),
    ADD COLUMN IF NOT EXISTS info_record          VARCHAR(20);

-- Backfill item_no from line_number where not set
UPDATE purchase_order_lines SET item_no = line_number WHERE item_no IS NULL;

-- ── 3. Block reasons master ───────────────────────────────────
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pol_block_reason'
    ) THEN
        ALTER TABLE purchase_order_lines
            ADD CONSTRAINT fk_pol_block_reason
            FOREIGN KEY (block_reason_code) REFERENCES po_block_reasons(code)
            ON UPDATE CASCADE;
    END IF;
END
$$;

-- ── 4. Item delivery settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS po_item_delivery (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id                 BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no               INT  NOT NULL,
    overdelivery_tol      NUMERIC(5,2) DEFAULT 0,
    underdelivery_tol     NUMERIC(5,2) DEFAULT 0,
    unlimited_overdeliv   BOOLEAN DEFAULT false,
    shipping_instr        VARCHAR(10),
    planned_deliv_time    INT,                  -- days
    reminder_1_days       INT,                  -- negative = before delivery date
    reminder_2_days       INT,
    reminder_3_days       INT,
    no_expeditors         INT DEFAULT 0,
    pl_deliv_time         INT DEFAULT 2,
    stock_type            VARCHAR(20) DEFAULT 'unrestricted',
    goods_receipt         BOOLEAN DEFAULT true,
    gr_non_valuated       BOOLEAN DEFAULT false,
    deliv_compl           BOOLEAN DEFAULT false,
    rem_shelf_life        INT,
    qa_control_key        VARCHAR(4),
    cert_type             VARCHAR(4),
    latest_gr_date        DATE,
    part_del_allowed      BOOLEAN DEFAULT true,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (po_id, item_no)
);

-- ── 5. Item invoice settings ──────────────────────────────────
CREATE TABLE IF NOT EXISTS po_item_invoice (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id            BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no          INT  NOT NULL,
    inv_receipt      BOOLEAN DEFAULT true,
    final_invoice    BOOLEAN DEFAULT false,
    gr_based_iv      BOOLEAN DEFAULT true,
    tax_code         VARCHAR(4),
    dp_category      VARCHAR(10),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (po_id, item_no)
);

-- ── 6. Delivery schedule lines ────────────────────────────────
CREATE TABLE IF NOT EXISTS po_delivery_schedule (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id                BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no              INT  NOT NULL,
    schedule_line        INT  NOT NULL DEFAULT 1,
    delivery_date        DATE NOT NULL,
    scheduled_qty        NUMERIC(15,3) NOT NULL,
    stat_del_date        DATE,
    gr_qty               NUMERIC(15,3) DEFAULT 0,
    open_qty             NUMERIC(15,3),
    purchase_req_id      BIGINT REFERENCES purchase_requests(id),
    req_item_no          INT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (po_id, item_no, schedule_line)
);

CREATE INDEX IF NOT EXISTS idx_po_delivery_schedule_po
    ON po_delivery_schedule (po_id, item_no);

-- ── 7. Item supplier confirmations ────────────────────────────
CREATE TABLE IF NOT EXISTS po_item_confirmation (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id                BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no              INT  NOT NULL,
    conf_control         VARCHAR(4) DEFAULT '0001',
    -- conf_control: 0001=Confirmations, 0002=Rough GR, 0003=Inb.Deliv/RoughGR, 0004=InboundDelivery
    sequence_no          INT  NOT NULL DEFAULT 1,
    conf_category        VARCHAR(2),              -- LA=InbDelivery, WE=RoughGR, AB=OrderAck
    delivery_date        DATE,
    quantity             NUMERIC(15,3),
    reference            VARCHAR(50),
    handover_date        DATE,
    handover_time        TIME,
    inbound_delivery_no  VARCHAR(20),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    order_ack_reqd       BOOLEAN DEFAULT true,
    rejection_ind        BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_po_confirmation_po
    ON po_item_confirmation (po_id, item_no);

-- ── 8. Account assignments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS po_account_assignments (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id            BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no          INT  NOT NULL,
    acct_assgt_cat   VARCHAR(2) NOT NULL,
    -- A=Asset, C=Sales order, D=IndivCust/Project, F=Order, G=MTSProd/Project
    -- K=Cost center, M=IndCust-wKDCO, N=Network, P=Project, Q=ProjectMTO, T=AllNewAux
    distribution     VARCHAR(1) DEFAULT '1',    -- 1=quantity, 2=percentage
    sequence_no      INT  NOT NULL DEFAULT 1,
    gl_account       VARCHAR(10),
    co_area          VARCHAR(4),
    cost_center      VARCHAR(10),
    sales_order      VARCHAR(20),
    sales_order_item INT,
    project_wbs      VARCHAR(24),
    network          VARCHAR(12),
    network_activity VARCHAR(8),
    order_no         VARCHAR(12),
    asset_no         VARCHAR(12),
    sub_asset_no     VARCHAR(4),
    quantity         NUMERIC(15,3),
    percentage       NUMERIC(5,2),
    net_value        NUMERIC(18,2),
    unloading_point  VARCHAR(25),
    funded_program   VARCHAR(20),
    partial_invoice  VARCHAR(2) DEFAULT '1',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_acct_assign_po
    ON po_account_assignments (po_id, item_no);

-- ── 9. PO header conditions (pricing) ────────────────────────
CREATE TABLE IF NOT EXISTS po_header_conditions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id           BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    condition_type  VARCHAR(4) NOT NULL,
    -- PB00=GrossPrice, HB00=HeaderSurcharge, SKTO=CashDiscount, FRC1=Freight, NAVS=NonDeductTax
    name            VARCHAR(40),
    amount          NUMERIC(18,4),
    currency        VARCHAR(3),
    per_qty         NUMERIC(10,3) DEFAULT 1,
    uom             VARCHAR(6),
    condition_value NUMERIC(18,4),
    condition_class VARCHAR(1),   -- A=Discount/Surch, B=Price
    calc_type       VARCHAR(1),   -- A=Percent, B=Fixed, C=Quantity
    inactive        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. PO item conditions (pricing) ─────────────────────────
CREATE TABLE IF NOT EXISTS po_item_conditions (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id           BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_no         INT  NOT NULL,
    condition_type  VARCHAR(4) NOT NULL,
    name            VARCHAR(40),
    amount          NUMERIC(18,4),
    currency        VARCHAR(3),
    per_qty         NUMERIC(10,3) DEFAULT 1,
    uom             VARCHAR(6),
    condition_value NUMERIC(18,4),
    condition_class VARCHAR(1),
    calc_type       VARCHAR(1),
    inactive        BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_item_conditions_po
    ON po_item_conditions (po_id, item_no);

-- ── 11. PO output messages log ────────────────────────────────
CREATE TABLE IF NOT EXISTS po_output_messages (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id            BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    output_type      VARCHAR(4) DEFAULT 'NEU',
    medium           VARCHAR(1) DEFAULT '1',  -- 1=Print,2=Fax,5=Email,6=EDI
    partner_function VARCHAR(2) DEFAULT 'VN',
    vendor_id        BIGINT REFERENCES suppliers(id),
    language         VARCHAR(2) DEFAULT 'EN',
    status           VARCHAR(1) DEFAULT '0',  -- 0=pending,1=sent,2=error,3=repeat
    spool_no         VARCHAR(20),
    error_msg        TEXT,
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 12. PO status view (replaces Status tab query) ───────────
CREATE OR REPLACE VIEW po_status_summary AS
SELECT
    po.id                                                   AS po_id,
    po.po_number,
    pol.item_no,
    pol.quantity                                            AS ordered_qty,
    pol.unit                                                AS order_unit,
    pol.unit_price                                          AS net_price,
    pol.currency,
    COALESCE(SUM(ds.gr_qty), 0)                             AS delivered_qty,
    pol.quantity - COALESCE(SUM(ds.gr_qty), 0)              AS still_to_deliver_qty,
    COALESCE(pol.qty_invoiced, 0)                           AS invoiced_qty,
    (pol.quantity - COALESCE(SUM(ds.gr_qty), 0)) * pol.unit_price
                                                            AS still_to_deliver_val,
    po.output_sent,
    po.output_sent_at
FROM purchase_orders po
JOIN purchase_order_lines pol ON pol.po_id = po.id
LEFT JOIN po_delivery_schedule ds ON ds.po_id = po.id AND ds.item_no = pol.item_no
GROUP BY po.id, po.po_number, pol.item_no, pol.quantity,
         pol.unit, pol.unit_price, pol.currency,
         pol.qty_invoiced, po.output_sent, po.output_sent_at;

-- ── 13. Seed condition type reference data ────────────────────
CREATE TABLE IF NOT EXISTS pricing_condition_types (
    code            VARCHAR(4) PRIMARY KEY,
    description     VARCHAR(60) NOT NULL,
    condition_class VARCHAR(1) NOT NULL,  -- A=Disc/Surch, B=Price
    calc_type       VARCHAR(1) NOT NULL,  -- A=%, B=Fixed, C=Qty
    plus_minus      VARCHAR(1) DEFAULT 'X', -- X=both, +, -
    access_seq      VARCHAR(4),
    active          BOOLEAN DEFAULT true
);

INSERT INTO pricing_condition_types (code, description, condition_class, calc_type, plus_minus) VALUES
    ('PB00', 'Gross price',               'B', 'C', '+'),
    ('PBXX', 'Gross price (manual)',      'B', 'C', '+'),
    ('HB00', 'Header surcharge (value)',  'A', 'B', 'X'),
    ('NAVS', 'Non-deductible tax',        'A', 'A', '+'),
    ('FRC1', 'Freight / quantity',        'A', 'C', '+'),
    ('SKTO', 'Cash discount',             'A', 'A', '-'),
    ('WOTB', 'OTB procurement',           'A', 'B', 'X'),
    ('RA00', 'Percentage discount',       'A', 'A', '-'),
    ('RA01', 'Absolute discount',         'A', 'B', '-'),
    ('ZF00', 'Freight (value)',           'A', 'B', '+')
ON CONFLICT DO NOTHING;

-- ── 14. Indexes for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_po_lines_blocked    ON purchase_order_lines (blocked) WHERE blocked = true;
CREATE INDEX IF NOT EXISTS idx_po_lines_deleted    ON purchase_order_lines (deleted) WHERE deleted = false;
CREATE INDEX IF NOT EXISTS idx_po_collective_no    ON purchase_orders (collective_no) WHERE collective_no IS NOT NULL;

COMMIT;
