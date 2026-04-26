-- 024_routerunner.sql
-- RouteRunner: Carriers, Shipments, Shipment Lines

-- Drop old versions if they exist (they have incompatible schemas)
DROP TABLE IF EXISTS shipment_lines CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS carriers CASCADE;

-- Carrier master
CREATE TABLE carriers (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id     UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id     BIGINT NOT NULL REFERENCES tenants(id),
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    mode          TEXT NOT NULL DEFAULT 'ROAD'
                  CHECK (mode IN ('ROAD','SEA','AIR','RAIL','COURIER')),
    tracking_url  TEXT,
    contact_name  TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- Shipments
CREATE TABLE shipments (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    shipment_number TEXT NOT NULL,
    sales_order_id  BIGINT REFERENCES sales_orders(id),
    carrier_id      BIGINT REFERENCES carriers(id),
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN (
                      'PENDING','PICKING','PACKED',
                      'DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED'
                    )),
    ship_from_site  BIGINT REFERENCES sites(id),
    ship_to_address TEXT,
    ship_to_city    TEXT,
    ship_to_country TEXT DEFAULT 'GB',
    tracking_ref    TEXT,
    planned_date    DATE,
    dispatched_at   TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    notes           TEXT,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, shipment_number)
);

-- Shipment lines (linked to SO lines)
CREATE TABLE shipment_lines (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id           UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    shipment_id         BIGINT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    sales_order_line_id BIGINT REFERENCES sales_order_lines(id),
    line_number         INT NOT NULL,
    description         TEXT NOT NULL,
    quantity            NUMERIC(14,3) NOT NULL,
    unit_of_measure     TEXT NOT NULL DEFAULT 'EA',
    material_id         BIGINT REFERENCES products(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-number sequence for shipments
CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.shipment_number IS NULL OR NEW.shipment_number = '' THEN
        NEW.shipment_number := 'SHP-' || to_char(NOW(), 'YYYY') || '-'
                              || LPAD(nextval('shipment_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shipment_number ON shipments;
CREATE TRIGGER trg_shipment_number
    BEFORE INSERT ON shipments
    FOR EACH ROW EXECUTE FUNCTION generate_shipment_number();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_tenant      ON shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status      ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_so          ON shipments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_lines_ship   ON shipment_lines(shipment_id);
CREATE INDEX IF NOT EXISTS idx_carriers_tenant       ON carriers(tenant_id);
