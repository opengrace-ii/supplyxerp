CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'operator')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    base_uom TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS handling_units (
    id UUID PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    material_code TEXT NOT NULL,
    quantity NUMERIC(16,3) NOT NULL CHECK (quantity >= 0),
    uom TEXT NOT NULL,
    status TEXT NOT NULL,
    location_code TEXT NOT NULL,
    parent_hu_id UUID NULL REFERENCES handling_units(id),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_number BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_handling_units_parent ON handling_units(parent_hu_id);
CREATE INDEX IF NOT EXISTS idx_handling_units_last_event_at ON handling_units(last_event_at DESC);

CREATE TABLE IF NOT EXISTS hu_events (
    id UUID PRIMARY KEY,
    hu_id UUID NOT NULL REFERENCES handling_units(id),
    event_type TEXT NOT NULL,
    quantity_delta NUMERIC(16,3) NOT NULL DEFAULT 0,
    from_location TEXT NULL,
    to_location TEXT NULL,
    actor_user_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hu_events_hu_time ON hu_events(hu_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hu_events_time ON hu_events(occurred_at DESC);

CREATE TABLE IF NOT EXISTS barcode_bindings (
    barcode TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_barcode_bindings_entity ON barcode_bindings(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS scan_locks (
    barcode_hash TEXT PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_locks_expires ON scan_locks(expires_at);

CREATE TABLE IF NOT EXISTS warehouse_tasks (
    id UUID PRIMARY KEY,
    task_type TEXT NOT NULL,
    hu_id UUID NOT NULL REFERENCES handling_units(id),
    from_location TEXT NULL,
    to_location TEXT NULL,
    status TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_tasks_time ON warehouse_tasks(created_at DESC);

CREATE TABLE IF NOT EXISTS pricing_history (
    id UUID PRIMARY KEY,
    material_code TEXT NOT NULL,
    currency TEXT NOT NULL,
    price NUMERIC(16,4) NOT NULL CHECK (price > 0),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_lookup ON pricing_history(material_code, currency, valid_from DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    after_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_operations (
    id UUID PRIMARY KEY,
    reason TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_operations_created_at ON blocked_operations(created_at DESC);

CREATE TABLE IF NOT EXISTS execution_traces (
    trace_id UUID PRIMARY KEY,
    request_type TEXT NOT NULL,
    status TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_execution_traces_created_at ON execution_traces(created_at DESC);

CREATE TABLE IF NOT EXISTS execution_trace_steps (
    id BIGSERIAL PRIMARY KEY,
    trace_id UUID NOT NULL REFERENCES execution_traces(trace_id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trace_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_execution_trace_steps_trace ON execution_trace_steps(trace_id, step_order ASC);

INSERT INTO products (id, code, name, base_uom, created_at)
VALUES
    ('2b111111-1111-1111-1111-111111111111', 'FABRIC-ROLL', 'Fabric Roll', 'KG', NOW()),
    ('2b222222-2222-2222-2222-222222222222', 'LAMINATE', 'Laminate', 'IMP', NOW())
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    base_uom = EXCLUDED.base_uom;

INSERT INTO handling_units (id, code, material_code, quantity, uom, status, location_code, parent_hu_id, created_by, created_at, last_event_at, version_number)
VALUES
    ('1a111111-1111-1111-1111-111111111111', 'HU-1001', 'FABRIC-ROLL', 315.000, 'KG', 'AVAILABLE', 'RECV-01', NULL, 'system', NOW(), NOW(), 0),
    ('1a222222-2222-2222-2222-222222222222', 'HU-1002', 'LAMINATE', 21.160, 'IMP', 'AVAILABLE', 'RECV-02', NULL, 'system', NOW(), NOW(), 0)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code,
    material_code = EXCLUDED.material_code,
    quantity = EXCLUDED.quantity,
    uom = EXCLUDED.uom,
    status = EXCLUDED.status,
    location_code = EXCLUDED.location_code,
    last_event_at = NOW();

INSERT INTO barcode_bindings (barcode, entity_type, entity_id, is_active, created_at)
VALUES
    ('HU-1001', 'HU', '1a111111-1111-1111-1111-111111111111', TRUE, NOW()),
    ('HU-1002', 'HU', '1a222222-2222-2222-2222-222222222222', TRUE, NOW())
ON CONFLICT (barcode) DO UPDATE
SET entity_type = EXCLUDED.entity_type,
    entity_id = EXCLUDED.entity_id,
    is_active = TRUE;
