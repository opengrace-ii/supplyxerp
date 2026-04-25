BEGIN;

-- Drop existing empty tables to avoid conflicts with new schema
DROP TABLE IF EXISTS shipment_lines CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS sales_order_lines CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- CUSTOMERS (the demand side)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customers (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id        BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id),
    customer_number  VARCHAR(30) UNIQUE NOT NULL,
    name             VARCHAR(200) NOT NULL,
    email            VARCHAR(200),
    phone            VARCHAR(50),
    address_line1    VARCHAR(200),
    address_line2    VARCHAR(200),
    city             VARCHAR(100),
    country          VARCHAR(60),
    postal_code      VARCHAR(20),
    currency         VARCHAR(3) DEFAULT 'USD',
    payment_terms    VARCHAR(50),
    credit_limit     NUMERIC(18,2),
    outstanding_balance NUMERIC(18,2) DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'ACTIVE',
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DEALS (Sales Orders — SupplyXERP name: DealFlow)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deals (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id        BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id),
    deal_number      VARCHAR(30) UNIQUE NOT NULL,
    customer_id      BIGINT NOT NULL REFERENCES customers(id),
    deal_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_delivery DATE,
    confirmed_delivery DATE,
    status           VARCHAR(20) DEFAULT 'DRAFT',
    currency         VARCHAR(3) DEFAULT 'USD',
    subtotal         NUMERIC(18,2) DEFAULT 0,
    tax_amount       NUMERIC(18,2) DEFAULT 0,
    total_amount     NUMERIC(18,2) DEFAULT 0,
    payment_status   VARCHAR(20) DEFAULT 'UNPAID',
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_lines (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deal_id          BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    line_no          INT NOT NULL,
    material_id      BIGINT REFERENCES products(id),
    description      TEXT,
    ordered_qty      NUMERIC(15,3) NOT NULL,
    confirmed_qty    NUMERIC(15,3),
    shipped_qty      NUMERIC(15,3) DEFAULT 0,
    unit_of_measure  VARCHAR(6),
    unit_price       NUMERIC(18,4),
    discount_pct     NUMERIC(5,2) DEFAULT 0,
    line_total       NUMERIC(18,2) GENERATED ALWAYS AS (
        ROUND((COALESCE(confirmed_qty, ordered_qty) *
               unit_price * (1 - COALESCE(discount_pct,0)/100))::numeric, 2)
    ) STORED,
    availability_status VARCHAR(20) DEFAULT 'UNCHECKED',
    available_qty    NUMERIC(15,3) DEFAULT 0,
    UNIQUE (deal_id, line_no)
);

-- Stock availability reservations
CREATE TABLE IF NOT EXISTS stock_reservations (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    deal_id          BIGINT NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    deal_line_no     INT NOT NULL,
    material_id      BIGINT NOT NULL REFERENCES products(id),
    reserved_qty     NUMERIC(15,3) NOT NULL,
    reserved_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at       TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'ACTIVE',
    UNIQUE (deal_id, deal_line_no)
);

-- ═══════════════════════════════════════════════════════════════
-- ROUTE RUNNER (Shipments / Outbound Delivery)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shipments (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id        BIGINT NOT NULL DEFAULT 1 REFERENCES tenants(id),
    shipment_number  VARCHAR(30) UNIQUE NOT NULL,
    deal_id          BIGINT REFERENCES deals(id),
    customer_id      BIGINT REFERENCES customers(id),
    status           VARCHAR(20) DEFAULT 'PICKING',
    carrier          VARCHAR(100),
    tracking_number  VARCHAR(100),
    dispatch_zone    VARCHAR(50),
    scheduled_dispatch DATE,
    actual_dispatch  TIMESTAMPTZ,
    delivery_address TEXT,
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipment_lines (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shipment_id      BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    deal_line_no     INT,
    material_id      BIGINT REFERENCES products(id),
    description      TEXT,
    planned_qty      NUMERIC(15,3),
    packed_qty       NUMERIC(15,3) DEFAULT 0,
    unit_of_measure  VARCHAR(6),
    hu_codes         TEXT[],
    status           VARCHAR(20) DEFAULT 'PENDING'
);

-- When a shipment is DISPATCHED, consume stock from warehouse
CREATE OR REPLACE FUNCTION consume_stock_on_dispatch()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'DISPATCHED' AND OLD.status != 'DISPATCHED' THEN
        -- Mark deal as SHIPPED
        UPDATE deals SET status = 'SHIPPED', updated_at = NOW()
        WHERE id = NEW.deal_id;

        -- Release stock reservations
        UPDATE stock_reservations
        SET status = 'CONSUMED'
        WHERE deal_id = NEW.deal_id AND status = 'ACTIVE';

        -- Update deal_lines shipped qty
        UPDATE deal_lines dl
        SET shipped_qty = dl.shipped_qty + sl.packed_qty
        FROM shipment_lines sl
        WHERE sl.shipment_id = NEW.id
          AND sl.deal_line_no = dl.line_no
          AND dl.deal_id = NEW.deal_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch ON shipments;
CREATE TRIGGER trg_dispatch
    AFTER UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION consume_stock_on_dispatch();

CREATE INDEX IF NOT EXISTS idx_deals_customer
    ON deals (customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_status
    ON deals (status);
CREATE INDEX IF NOT EXISTS idx_shipments_deal
    ON shipments (deal_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status
    ON shipments (status);

COMMIT;
