-- Drop existing tables
DROP TABLE IF EXISTS dispatch_logs;
DROP TABLE IF EXISTS dispatch_rules;

-- Dispatch rules — WHEN to send WHAT to WHOM
CREATE TABLE IF NOT EXISTS dispatch_rules (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    rule_name       TEXT NOT NULL,
    -- Trigger condition
    trigger_event   TEXT NOT NULL
                    CHECK (trigger_event IN (
                      'PO_CREATED','PO_CONFIRMED','PO_CANCELLED',
                      'GR_POSTED','SO_CONFIRMED','SO_DISPATCHED',
                      'SO_DELIVERED','SHIPMENT_DISPATCHED',
                      'INVOICE_MATCHED','QUALITY_FAILED',
                      'QUALITY_CONDITIONAL','LOW_STOCK',
                      'BUILD_ORDER_COMPLETED'
                    )),
    -- Channel
    channel         TEXT NOT NULL
                    CHECK (channel IN ('EMAIL','WEBHOOK','IN_APP')),
    -- Recipients
    recipient_type  TEXT NOT NULL DEFAULT 'FIXED'
                    CHECK (recipient_type IN (
                      'FIXED',      -- hardcoded email
                      'SUPPLIER',   -- supplier contact email
                      'CUSTOMER',   -- customer contact email
                      'ROLE'        -- all users with a given role
                    )),
    recipient_value TEXT NOT NULL,  -- email addr, webhook URL, or role name
    -- Template
    subject_template TEXT,
    body_template    TEXT,
    -- State
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, rule_name)
);

-- Dispatch log — every notification attempt recorded
CREATE TABLE IF NOT EXISTS dispatch_logs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id       UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    tenant_id       BIGINT NOT NULL REFERENCES tenants(id),
    dispatch_rule_id BIGINT REFERENCES dispatch_rules(id),
    -- What triggered it
    trigger_event   TEXT NOT NULL,
    reference_type  TEXT,
    reference_id    BIGINT,
    reference_code  TEXT,
    -- Where it went
    channel         TEXT NOT NULL,
    recipient       TEXT NOT NULL,
    subject         TEXT,
    -- Outcome
    status          TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN (
                      'PENDING','SENT','FAILED','SKIPPED'
                    )),
    error_message   TEXT,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dispatch_rules_tenant  ON dispatch_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_rules_event   ON dispatch_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_tenant   ON dispatch_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_status   ON dispatch_logs(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_event    ON dispatch_logs(trigger_event);
CREATE INDEX IF NOT EXISTS idx_dispatch_logs_ref      ON dispatch_logs(reference_type, reference_id);
