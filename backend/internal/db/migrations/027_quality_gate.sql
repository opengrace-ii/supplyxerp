-- 027_quality_gate.sql

DROP TABLE IF EXISTS quality_check_findings CASCADE;
DROP TABLE IF EXISTS quality_checks CASCADE;

-- Scorecard events for tracking vendor performance
CREATE TABLE IF NOT EXISTS vendor_scorecard_events (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    supplier_id     BIGINT NOT NULL REFERENCES suppliers(id),
    event_type      TEXT NOT NULL
                    CHECK (event_type IN (
                      'ON_TIME_DELIVERY', 'LATE_DELIVERY', 'EARLY_DELIVERY',
                      'QUALITY_PASS', 'QUALITY_FAIL', 'QUALITY_PARTIAL',
                      'QUANTITY_SHORT', 'QUANTITY_OVER', 'QUANTITY_EXACT',
                      'INVOICE_DISPUTE', 'INVOICE_CORRECT',
                      'PACT_COMPLIANCE', 'PACT_BREACH'
                    )),
    reference_type  TEXT,
    reference_id    BIGINT,
    reference_code  TEXT,
    score_impact    NUMERIC(6,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    recorded_by     BIGINT REFERENCES users(id),
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scorecard_events_tenant   ON vendor_scorecard_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_events_supplier ON vendor_scorecard_events(supplier_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_events_type     ON vendor_scorecard_events(event_type);

CREATE TABLE IF NOT EXISTS quality_checks (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    qc_number       TEXT NOT NULL,
    -- What is being inspected
    reference_type  TEXT NOT NULL 
                    CHECK (reference_type IN (
                      'GOODS_RECEIPT','BUILD_ORDER','STOCK','SUPPLIER_RETURN'
                    )),
    reference_id    BIGINT,
    reference_code  TEXT,
    -- Who supplied it
    supplier_id     BIGINT REFERENCES suppliers(id),
    material_id     BIGINT REFERENCES products(id),
    -- Quantities
    inspect_qty     NUMERIC(14,3) NOT NULL,
    passed_qty      NUMERIC(14,3) DEFAULT 0,
    failed_qty      NUMERIC(14,3) DEFAULT 0,
    unit_of_measure TEXT DEFAULT 'EA',
    -- Result
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN (
                      'PENDING','IN_PROGRESS','PASSED',
                      'FAILED','CONDITIONAL','CANCELLED'
                    )),
    result          TEXT
                    CHECK (result IN (
                      'ACCEPT','REJECT','CONDITIONAL'
                    )),
    -- Disposition
    accepted_zone_id BIGINT REFERENCES zones(id),
    rejected_zone_id BIGINT REFERENCES zones(id),
    -- People
    inspector_id    BIGINT REFERENCES users(id),
    notes           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      BIGINT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, qc_number)
);

-- Quality check findings (individual defects found)
CREATE TABLE IF NOT EXISTS quality_check_findings (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    quality_check_id BIGINT NOT NULL REFERENCES quality_checks(id) ON DELETE CASCADE,
    finding_number  INT NOT NULL,
    finding_type    TEXT NOT NULL
                    CHECK (finding_type IN (
                      'DIMENSION','WEIGHT','APPEARANCE','CONTAMINATION',
                      'LABELLING','DOCUMENTATION','QUANTITY','OTHER'
                    )),
    severity        TEXT NOT NULL DEFAULT 'MINOR'
                    CHECK (severity IN ('MINOR','MAJOR','CRITICAL')),
    description     TEXT NOT NULL,
    quantity_affected NUMERIC(14,3) DEFAULT 0,
    is_resolved     BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-number for QC
CREATE SEQUENCE IF NOT EXISTS qc_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_qc_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.qc_number IS NULL OR NEW.qc_number = '' THEN
        NEW.qc_number := 'QC-' || to_char(NOW(), 'YYYY') || '-'
                        || LPAD(nextval('qc_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qc_number ON quality_checks;
CREATE TRIGGER trg_qc_number
    BEFORE INSERT ON quality_checks
    FOR EACH ROW EXECUTE FUNCTION generate_qc_number();

CREATE INDEX IF NOT EXISTS idx_qc_tenant     ON quality_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qc_status     ON quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_qc_supplier   ON quality_checks(supplier_id);
CREATE INDEX IF NOT EXISTS idx_qc_reference  ON quality_checks(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_qc_findings   ON quality_check_findings(quality_check_id);
