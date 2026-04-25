-- Migration: 023_dealflow_complete.sql
-- Drop old tables that don't match the required schema
DROP TABLE IF EXISTS sales_order_lines CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Customers master
CREATE TABLE IF NOT EXISTS customers (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id   UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id),
    code        TEXT NOT NULL,
    name        TEXT NOT NULL,
    email       TEXT,
    phone       TEXT,
    address     TEXT,
    city        TEXT,
    country     TEXT DEFAULT 'GB',
    currency    TEXT DEFAULT 'GBP',
    credit_limit NUMERIC(14,2) DEFAULT 0,
    payment_terms TEXT DEFAULT 'NET30',
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- Sales orders header
CREATE TABLE IF NOT EXISTS sales_orders (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    so_number       TEXT NOT NULL,
    customer_id     BIGINT NOT NULL REFERENCES customers(id),
    status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','CONFIRMED','PICKING',
                                      'PACKED','DISPATCHED','DELIVERED','CANCELLED')),
    order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    requested_date  DATE,
    currency        TEXT DEFAULT 'GBP',
    subtotal        NUMERIC(14,2) DEFAULT 0,
    tax_amount      NUMERIC(14,2) DEFAULT 0,
    total_amount    NUMERIC(14,2) DEFAULT 0,
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    confirmed_at    TIMESTAMPTZ,
    confirmed_by    BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, so_number)
);

-- Sales order lines
CREATE TABLE IF NOT EXISTS sales_order_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    sales_order_id  BIGINT NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    material_id     BIGINT REFERENCES products(id),
    description     TEXT NOT NULL,
    quantity        NUMERIC(14,3) NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    unit_price      NUMERIC(14,4) NOT NULL DEFAULT 0,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    line_total      NUMERIC(14,2) GENERATED ALWAYS AS (
                      ROUND(quantity * unit_price * (1 - discount_pct/100), 2)
                    ) STORED,
    delivered_qty   NUMERIC(14,3) DEFAULT 0,
    status          TEXT DEFAULT 'OPEN'
                    CHECK (status IN ('OPEN','PARTIAL','DELIVERED','CANCELLED')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-number sequence for SO
CREATE SEQUENCE IF NOT EXISTS so_number_seq START 1;

-- Trigger: auto-generate SO number
CREATE OR REPLACE FUNCTION generate_so_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.so_number IS NULL OR NEW.so_number = '' THEN
        NEW.so_number := 'SO-' || to_char(NOW(), 'YYYY') || '-'
                        || LPAD(nextval('so_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_so_number ON sales_orders;
CREATE TRIGGER trg_so_number
    BEFORE INSERT ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION generate_so_number();

-- Update totals trigger
CREATE OR REPLACE FUNCTION update_so_totals()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_orders
    SET
        subtotal     = (SELECT COALESCE(SUM(line_total), 0)
                        FROM sales_order_lines
                        WHERE sales_order_id = NEW.sales_order_id),
        total_amount = (SELECT COALESCE(SUM(line_total), 0)
                        FROM sales_order_lines
                        WHERE sales_order_id = NEW.sales_order_id),
        updated_at   = NOW()
    WHERE id = NEW.sales_order_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_so_totals ON sales_order_lines;
CREATE TRIGGER trg_so_totals
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_lines
    FOR EACH ROW EXECUTE FUNCTION update_so_totals();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant   ON sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status   ON sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_so_lines_order        ON sales_order_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant      ON customers(tenant_id);
