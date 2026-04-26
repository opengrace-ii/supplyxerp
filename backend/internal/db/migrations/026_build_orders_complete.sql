-- 026_build_orders_complete.sql

-- Drop existing tables to align with new schema (they are empty)
DROP TABLE IF EXISTS build_order_outputs CASCADE;
DROP TABLE IF EXISTS build_order_issues CASCADE;
DROP TABLE IF EXISTS build_order_components CASCADE;
DROP TABLE IF EXISTS bom_lines CASCADE;
DROP TABLE IF EXISTS build_orders CASCADE;
DROP TABLE IF EXISTS bill_of_materials CASCADE;

-- Bill of Materials header
CREATE TABLE bill_of_materials (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    output_material_id BIGINT NOT NULL REFERENCES products(id),
    bom_code        TEXT NOT NULL,
    description     TEXT,
    base_qty        NUMERIC(14,3) NOT NULL DEFAULT 1,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    is_active       BOOLEAN DEFAULT true,
    version         INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, bom_code)
);

-- BOM component lines
CREATE TABLE bom_lines (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bom_id          BIGINT NOT NULL REFERENCES bill_of_materials(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    component_material_id BIGINT NOT NULL REFERENCES products(id),
    quantity        NUMERIC(14,3) NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    scrap_pct       NUMERIC(5,2) DEFAULT 0,
    notes           TEXT
);

-- Build Orders
CREATE TABLE build_orders (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id           UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
    bo_number           TEXT NOT NULL,
    bom_id              BIGINT REFERENCES bill_of_materials(id),
    output_material_id  BIGINT NOT NULL REFERENCES products(id),
    status              TEXT NOT NULL DEFAULT 'DRAFT'
                        CHECK (status IN (
                          'DRAFT','RELEASED','IN_PROGRESS',
                          'COMPLETED','CANCELLED'
                        )),
    planned_qty         NUMERIC(14,3) NOT NULL,
    actual_qty          NUMERIC(14,3) DEFAULT 0,
    unit_of_measure     TEXT NOT NULL DEFAULT 'EA',
    planned_start       DATE,
    planned_finish      DATE,
    actual_start        TIMESTAMPTZ,
    actual_finish       TIMESTAMPTZ,
    priority            TEXT DEFAULT 'NORMAL'
                        CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    notes               TEXT,
    created_by          BIGINT REFERENCES users(id),
    released_by         BIGINT REFERENCES users(id),
    released_at         TIMESTAMPTZ,
    completed_by        BIGINT REFERENCES users(id),
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, bo_number)
);

-- Component issues (what was consumed from stock for this BO)
CREATE TABLE build_order_issues (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    build_order_id  BIGINT NOT NULL REFERENCES build_orders(id) ON DELETE CASCADE,
    material_id     BIGINT NOT NULL REFERENCES products(id),
    issued_qty      NUMERIC(14,3) NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    issued_by       BIGINT REFERENCES users(id),
    notes           TEXT
);

-- Auto-number sequence for Build Orders
CREATE SEQUENCE IF NOT EXISTS bo_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_bo_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.bo_number IS NULL OR NEW.bo_number = '' THEN
        NEW.bo_number := 'BO-' || to_char(NOW(), 'YYYY') || '-'
                        || LPAD(nextval('bo_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bo_number ON build_orders;
CREATE TRIGGER trg_bo_number
    BEFORE INSERT ON build_orders
    FOR EACH ROW EXECUTE FUNCTION generate_bo_number();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_build_orders_tenant   ON build_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_build_orders_status   ON build_orders(status);
CREATE INDEX IF NOT EXISTS idx_build_orders_material ON build_orders(output_material_id);
CREATE INDEX IF NOT EXISTS idx_bom_output            ON bill_of_materials(output_material_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom         ON bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_bo_issues_bo          ON build_order_issues(build_order_id);
