BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- BUILD ORDERS (SupplyXERP Production Planning)
-- A Build Order is an instruction to manufacture a product
-- from specified raw materials. No routing, no work centers —
-- just: what goes in, what comes out, by when.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS build_orders (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_number     VARCHAR(30) UNIQUE NOT NULL,
    -- Auto-generated: BUILD-2026-00001
    output_material_id BIGINT REFERENCES products(id),
    output_description TEXT,
    -- if no material master, describe what's being made
    planned_qty      NUMERIC(15,3) NOT NULL,
    actual_qty       NUMERIC(15,3) DEFAULT 0,
    unit_of_measure  VARCHAR(6),
    planned_start    DATE,
    planned_finish   DATE,
    actual_start     TIMESTAMPTZ,
    actual_finish    TIMESTAMPTZ,
    status           VARCHAR(20) DEFAULT 'DRAFT',
    -- DRAFT, RELEASED, IN_PROGRESS, COMPLETED, CANCELLED
    priority         VARCHAR(10) DEFAULT 'NORMAL',
    -- LOW, NORMAL, HIGH, URGENT
    production_zone  VARCHAR(50),
    -- which zone this is being built in
    output_zone      VARCHAR(50),
    -- where to put the finished goods
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Bill of Materials (what raw materials go IN)
CREATE TABLE IF NOT EXISTS build_order_components (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    build_order_id   BIGINT NOT NULL REFERENCES build_orders(id) ON DELETE CASCADE,
    sequence         INT NOT NULL,
    material_id      BIGINT REFERENCES products(id),
    description      TEXT,
    required_qty     NUMERIC(15,3) NOT NULL,
    issued_qty       NUMERIC(15,3) DEFAULT 0,
    unit_of_measure  VARCHAR(6),
    issue_status     VARCHAR(20) DEFAULT 'PENDING',
    -- PENDING, PARTIAL, ISSUED, EXCESS
    notes            TEXT,
    UNIQUE (build_order_id, sequence)
);

-- Material issues against a Build Order (what was actually consumed)
CREATE TABLE IF NOT EXISTS build_order_issues (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    build_order_id   BIGINT NOT NULL REFERENCES build_orders(id),
    component_seq    INT NOT NULL,
    hu_code          VARCHAR(50),
    -- which Handling Unit was consumed
    material_id      BIGINT REFERENCES products(id),
    issued_qty       NUMERIC(15,3) NOT NULL,
    unit_of_measure  VARCHAR(6),
    issued_by        VARCHAR(100),
    issued_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Production output confirmations (what was actually produced)
CREATE TABLE IF NOT EXISTS build_order_outputs (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    build_order_id   BIGINT NOT NULL REFERENCES build_orders(id),
    confirmed_qty    NUMERIC(15,3) NOT NULL,
    output_hu_code   VARCHAR(50),
    -- HU created for the finished goods
    output_zone      VARCHAR(50),
    confirmed_by     VARCHAR(100),
    confirmed_at     TIMESTAMPTZ DEFAULT NOW(),
    notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_build_status
    ON build_orders (status);
CREATE INDEX IF NOT EXISTS idx_build_material
    ON build_orders (output_material_id);

-- ═══════════════════════════════════════════════════════════════
-- QUALITY GATE (SupplyXERP Quality Management)
-- A Quality Check is automatically created when:
--   1. A Goods Receipt (Delivery Confirmation) is posted
--   2. A Build Order is completed
-- The inspector records the result. Failed stock goes to quarantine.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quality_checks (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    check_number     VARCHAR(30) UNIQUE NOT NULL,
    -- Auto-generated: QC-2026-00001
    trigger_type     VARCHAR(20) NOT NULL,
    -- 'GOODS_RECEIPT' or 'PRODUCTION_OUTPUT'
    trigger_id       BIGINT NOT NULL,
    -- dc_id for GR trigger, build_order_id for production trigger
    material_id      BIGINT REFERENCES products(id),
    material_name    TEXT,
    quantity_to_inspect NUMERIC(15,3) NOT NULL,
    quantity_passed  NUMERIC(15,3) DEFAULT 0,
    quantity_failed  NUMERIC(15,3) DEFAULT 0,
    quantity_pending NUMERIC(15,3),
    -- calculated as to_inspect - passed - failed
    status           VARCHAR(20) DEFAULT 'OPEN',
    -- OPEN, IN_PROGRESS, PASSED, FAILED, PARTIAL
    result           VARCHAR(20),
    -- ACCEPT, REJECT, CONDITIONAL_ACCEPT
    -- ACCEPT = all passes, post to storage
    -- REJECT = all fails, send to quarantine
    -- CONDITIONAL_ACCEPT = partial pass, partial quarantine
    failure_category VARCHAR(50),
    -- plain description: "Dimensional", "Visual", "Functional", "Contamination"
    inspector        VARCHAR(100),
    inspection_date  DATE,
    supplier_id      BIGINT REFERENCES suppliers(id),
    batch_ref        VARCHAR(50),
    quarantine_zone  VARCHAR(50),
    storage_zone     VARCHAR(50),
    -- where to put passed stock
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Individual inspection findings per quality check
CREATE TABLE IF NOT EXISTS quality_check_findings (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    check_id         BIGINT NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
    finding_no       INT NOT NULL,
    finding_type     VARCHAR(20) NOT NULL,
    -- 'DEFECT', 'OBSERVATION', 'CRITICAL'
    category         VARCHAR(50),
    description      TEXT NOT NULL,
    quantity_affected NUMERIC(15,3) DEFAULT 0,
    severity         VARCHAR(10) DEFAULT 'MINOR',
    -- MINOR, MAJOR, CRITICAL
    resolved         BOOLEAN DEFAULT false,
    UNIQUE (check_id, finding_no)
);

-- Auto-create quality check when a DC is posted
CREATE OR REPLACE FUNCTION create_quality_check_on_dc()
RETURNS TRIGGER AS $$
DECLARE
    line_rec RECORD;
    seq_num  BIGINT;
    check_num VARCHAR(30);
BEGIN
    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
        -- Get next sequence number
        SELECT COALESCE(MAX(id), 0) + 1 INTO seq_num FROM quality_checks;
        check_num := 'QC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                     LPAD(seq_num::TEXT, 5, '0');

        -- Create one quality check per DC line that has qc_required = true
        FOR line_rec IN
            SELECT * FROM delivery_confirmation_lines
            WHERE dc_id = NEW.id AND qc_required = true
        LOOP
            INSERT INTO quality_checks
                (check_number, trigger_type, trigger_id, material_id,
                 quantity_to_inspect, quantity_pending, supplier_id, batch_ref)
            VALUES
                (check_num, 'GOODS_RECEIPT', NEW.id, line_rec.material_id,
                 line_rec.accepted_qty, line_rec.accepted_qty,
                 NEW.supplier_id, line_rec.batch_ref)
            ON CONFLICT DO NOTHING;

            -- Generate next check number for additional lines
            seq_num := seq_num + 1;
            check_num := 'QC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                         LPAD(seq_num::TEXT, 5, '0');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qc_on_dc ON delivery_confirmations;
CREATE TRIGGER trg_qc_on_dc
    AFTER UPDATE ON delivery_confirmations
    FOR EACH ROW EXECUTE FUNCTION create_quality_check_on_dc();

CREATE INDEX IF NOT EXISTS idx_qc_status
    ON quality_checks (status);
CREATE INDEX IF NOT EXISTS idx_qc_trigger
    ON quality_checks (trigger_type, trigger_id);
CREATE INDEX IF NOT EXISTS idx_qc_material
    ON quality_checks (material_id);

COMMIT;
