BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- DELIVERY CONFIRMATIONS (SupplyXERP name for Goods Receipt)
-- Records the physical arrival of goods against a Purchase Order.
-- This is the event that moves material into warehouse stock.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dc_number        VARCHAR(30) UNIQUE NOT NULL,
    -- Auto-generated: DC-2026-00001
    po_id            BIGINT NOT NULL REFERENCES purchase_orders(id),
    supplier_id      BIGINT REFERENCES suppliers(id),
    delivery_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_ref     VARCHAR(100),
    -- supplier's delivery note / packing list number
    status           VARCHAR(20) DEFAULT 'DRAFT',
    -- DRAFT, POSTED, REVERSED
    total_value      NUMERIC(18,2) DEFAULT 0,
    currency         VARCHAR(3),
    notes            TEXT,
    posted_by        VARCHAR(100),
    posted_at        TIMESTAMPTZ,
    reversed_by      VARCHAR(100),
    reversed_at      TIMESTAMPTZ,
    reversal_reason  TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_confirmation_lines (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dc_id            BIGINT NOT NULL REFERENCES delivery_confirmations(id) ON DELETE CASCADE,
    po_line_no       INT NOT NULL,
    material_id      BIGINT REFERENCES products(id),
    description      TEXT,
    ordered_qty      NUMERIC(15,3),
    -- copied from PO line for reference
    delivered_qty    NUMERIC(15,3) NOT NULL,
    -- what actually arrived
    accepted_qty     NUMERIC(15,3),
    -- accepted after inspection (equals delivered_qty if no QC)
    rejected_qty     NUMERIC(15,3) DEFAULT 0,
    unit_of_measure  VARCHAR(6),
    unit_price       NUMERIC(18,4),
    line_value       NUMERIC(18,2) GENERATED ALWAYS AS
                       (ROUND((accepted_qty * unit_price)::numeric, 2)) STORED,
    storage_zone     VARCHAR(50),
    -- where goods were placed in warehouse
    batch_ref        VARCHAR(50),
    -- supplier batch or lot number
    expiry_date      DATE,
    qc_required      BOOLEAN DEFAULT false,
    qc_status        VARCHAR(20) DEFAULT 'NOT_REQUIRED',
    -- NOT_REQUIRED, PENDING, PASSED, FAILED
    UNIQUE (dc_id, po_line_no)
);

-- Update po_delivery_schedule gr_qty when a DC is posted
-- (trigger handles this — see function below)

CREATE OR REPLACE FUNCTION update_gr_qty_on_dc_post()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
        -- Update delivery schedule received quantities
        UPDATE po_delivery_schedule ds
        SET gr_qty = ds.gr_qty + dcl.delivered_qty
        FROM delivery_confirmation_lines dcl
        WHERE dcl.dc_id = NEW.id
          AND ds.po_id = NEW.po_id
          AND ds.item_no = dcl.po_line_no;

        -- Update supply pact released quantities if PO linked to pact
        UPDATE supply_pact_lines spl
        SET released_qty = spl.released_qty + dcl.delivered_qty
        FROM delivery_confirmation_lines dcl
        JOIN supply_pact_releases spr ON spr.po_id = NEW.po_id
        WHERE dcl.dc_id = NEW.id
          AND spl.pact_id = spr.pact_id
          AND spl.line_no = spr.pact_line_no;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dc_post ON delivery_confirmations;
CREATE TRIGGER trg_dc_post
    AFTER UPDATE ON delivery_confirmations
    FOR EACH ROW EXECUTE FUNCTION update_gr_qty_on_dc_post();

CREATE INDEX IF NOT EXISTS idx_dc_po_id
    ON delivery_confirmations (po_id);
CREATE INDEX IF NOT EXISTS idx_dc_status
    ON delivery_confirmations (status);
CREATE INDEX IF NOT EXISTS idx_dc_date
    ON delivery_confirmations (delivery_date);

-- ═══════════════════════════════════════════════════════════════
-- INVOICE MATCHING (3-way match: PO + Delivery + Invoice)
-- Records supplier invoices and matches them against
-- POs and Delivery Confirmations before approving payment.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_invoices (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number   VARCHAR(30) UNIQUE NOT NULL,
    -- Auto-generated: INV-2026-00001
    supplier_invoice_ref VARCHAR(100),
    -- supplier's own invoice number
    supplier_id      BIGINT NOT NULL REFERENCES suppliers(id),
    po_id            BIGINT REFERENCES purchase_orders(id),
    dc_id            BIGINT REFERENCES delivery_confirmations(id),
    invoice_date     DATE NOT NULL,
    due_date         DATE,
    currency         VARCHAR(3) DEFAULT 'USD',
    subtotal         NUMERIC(18,2) DEFAULT 0,
    tax_amount       NUMERIC(18,2) DEFAULT 0,
    total_amount     NUMERIC(18,2) DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, MATCHED, APPROVED, REJECTED, PAID
    match_status     VARCHAR(20) DEFAULT 'UNMATCHED',
    -- UNMATCHED, PARTIAL_MATCH, MATCHED, EXCEPTION
    match_result     TEXT,
    -- plain English explanation of any mismatch
    approved_by      VARCHAR(100),
    approved_at      TIMESTAMPTZ,
    payment_ref      VARCHAR(100),
    paid_at          TIMESTAMPTZ,
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_invoice_lines (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id       BIGINT NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
    line_no          INT NOT NULL,
    description      TEXT,
    quantity         NUMERIC(15,3),
    unit_price       NUMERIC(18,4),
    line_total       NUMERIC(18,2),
    po_line_no       INT,
    -- reference to the original PO line
    dc_line_no       INT,
    -- reference to the delivery confirmation line
    match_variance   NUMERIC(18,2) DEFAULT 0,
    -- difference between invoice price and PO price
    match_status     VARCHAR(20) DEFAULT 'UNMATCHED'
);

CREATE INDEX IF NOT EXISTS idx_invoice_supplier
    ON supplier_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_po
    ON supplier_invoices (po_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status
    ON supplier_invoices (status);

-- Also add PURCHASING role if missing
INSERT INTO roles (name) VALUES ('PURCHASING') ON CONFLICT DO NOTHING;

COMMIT;
