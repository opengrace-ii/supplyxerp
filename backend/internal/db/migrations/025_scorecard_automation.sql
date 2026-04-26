-- 025_scorecard_automation.sql
-- Adds automated scoring infrastructure to vendor scorecards

BEGIN;

-- Ensure vendor_scorecard_events table exists with correct columns
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
    reference_type  TEXT,   -- 'PO', 'GR', 'QUALITY_CHECK', 'INVOICE'
    reference_id    BIGINT,
    reference_code  TEXT,
    score_impact    NUMERIC(6,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    recorded_by     BIGINT REFERENCES users(id),
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor scorecard summary (one row per supplier, auto-maintained)
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS auto_score NUMERIC(5,2) DEFAULT 100.0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS compliance_score NUMERIC(5,2) DEFAULT 100.0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS on_time_count INT DEFAULT 0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS late_count INT DEFAULT 0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS quality_pass INT DEFAULT 0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS quality_fail INT DEFAULT 0;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS last_calculated TIMESTAMPTZ;
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS calculated_by TEXT DEFAULT 'SYSTEM';
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id);
ALTER TABLE vendor_scorecards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Supply pact delivery schedule (if not already present)
CREATE TABLE IF NOT EXISTS supply_pact_deliveries (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    supply_pact_id  BIGINT NOT NULL REFERENCES supply_pacts(id) ON DELETE CASCADE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    scheduled_date  DATE NOT NULL,
    quantity        NUMERIC(14,3) NOT NULL,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    status          TEXT NOT NULL DEFAULT 'SCHEDULED'
                    CHECK (status IN ('SCHEDULED','RECEIVED','MISSED','PARTIAL')),
    received_qty    NUMERIC(14,3) DEFAULT 0,
    received_date   DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure supply_pacts has tenant_id
ALTER TABLE supply_pacts ADD COLUMN IF NOT EXISTS tenant_id BIGINT REFERENCES tenants(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scorecard_events_supplier
    ON vendor_scorecard_events(supplier_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_events_tenant
    ON vendor_scorecard_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_events_type
    ON vendor_scorecard_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pact_deliveries_pact
    ON supply_pact_deliveries(supply_pact_id);

COMMIT;
