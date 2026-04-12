CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core identity
CREATE TABLE tenants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id),
    username TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE user_roles (
    user_id BIGINT REFERENCES users(id),
    role_id BIGINT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Material master
CREATE TABLE products (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    base_unit TEXT NOT NULL,
    description TEXT,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE batches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    product_id BIGINT REFERENCES products(id),
    batch_number TEXT,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouse structure
CREATE TABLE warehouses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    name TEXT NOT NULL,
    code TEXT NOT NULL
);

CREATE TABLE locations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_id UUID DEFAULT gen_random_uuid(),
    tenant_id BIGINT REFERENCES tenants(id),
    warehouse_id BIGINT REFERENCES warehouses(id),
    code TEXT NOT NULL,
    zone TEXT,
    capacity NUMERIC,
    unit TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Handling units (core entity)
CREATE TABLE handling_units (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT REFERENCES tenants(id),
  parent_hu_id BIGINT REFERENCES handling_units(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id),
  batch_id BIGINT REFERENCES batches(id) ON DELETE SET NULL,
  location_id BIGINT REFERENCES locations(id),
  quantity NUMERIC NOT NULL CHECK (quantity >= 0),
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  label_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Barcodes (many barcodes can resolve to one entity)
CREATE TABLE barcodes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    code TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id BIGINT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, code)
);

-- Inventory event ledger (NEVER delete rows — append only)
CREATE TABLE inventory_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id BIGINT REFERENCES tenants(id),
  event_type TEXT NOT NULL,
  hu_id BIGINT REFERENCES handling_units(id),
  child_hu_id BIGINT REFERENCES handling_units(id) ON DELETE SET NULL,
  from_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  quantity NUMERIC,
  unit TEXT,
  actor_user_id BIGINT REFERENCES users(id),
  reference_doc TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);

CREATE TABLE inventory_events_2025
  PARTITION OF inventory_events
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE inventory_events_2026
  PARTITION OF inventory_events
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Warehouse tasks
CREATE TABLE warehouse_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID DEFAULT gen_random_uuid(),
  tenant_id BIGINT REFERENCES tenants(id),
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',
  hu_id BIGINT REFERENCES handling_units(id),
  from_location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id BIGINT REFERENCES locations(id),
  assigned_to BIGINT REFERENCES users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

-- Pricing (versioned, effective-date based)
CREATE TABLE price_versions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id),
  product_id BIGINT REFERENCES products(id),
  price NUMERIC NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'GBP',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  created_by BIGINT REFERENCES users(id)
);

-- Agent trace system
CREATE TABLE execution_traces (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trace_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id BIGINT REFERENCES tenants(id),
  operation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE execution_trace_steps (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trace_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  step_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log (immutable)
CREATE TABLE audit_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id),
  actor_id BIGINT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_public_id UUID,
  payload_before JSONB,
  payload_after JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Blocked operations log
CREATE TABLE blocked_operations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id),
  reason TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2 tables
CREATE TABLE purchase_orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    supplier TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE purchase_order_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    po_id BIGINT REFERENCES purchase_orders(id),
    product_id BIGINT REFERENCES products(id),
    qty_ordered NUMERIC,
    qty_received NUMERIC DEFAULT 0,
    unit TEXT
);

CREATE TABLE production_orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    product_id BIGINT REFERENCES products(id),
    planned_qty NUMERIC,
    actual_qty NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'PLANNED',
    planned_start TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bom_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    production_order_id BIGINT REFERENCES production_orders(id),
    product_id BIGINT REFERENCES products(id),
    required_qty NUMERIC,
    consumed_qty NUMERIC DEFAULT 0,
    unit TEXT
);

CREATE TABLE inspection_lots (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    trigger_type TEXT,
    hu_id BIGINT REFERENCES handling_units(id),
    status TEXT DEFAULT 'PENDING',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_orders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    customer TEXT,
    status TEXT DEFAULT 'DRAFT',
    total_value NUMERIC,
    currency TEXT DEFAULT 'GBP',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales_order_lines (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    so_id BIGINT REFERENCES sales_orders(id),
    product_id BIGINT REFERENCES products(id),
    qty NUMERIC,
    unit TEXT,
    unit_price NUMERIC
);

CREATE TABLE shipments (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id BIGINT REFERENCES tenants(id),
    carrier TEXT,
    tracking_ref TEXT,
    status TEXT DEFAULT 'PLANNED',
    planned_dispatch TIMESTAMPTZ,
    actual_dispatch TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Data (will be generated by Go or executed manually, we can place them here)
INSERT INTO tenants (name, slug) VALUES ('TechLogix UK', 'techlogix') ON CONFLICT DO NOTHING;
INSERT INTO roles (name) VALUES ('ADMIN'),('WAREHOUSE_MANAGER'),('OPERATOR'),('VIEWER');
INSERT INTO users (tenant_id, username, email, password_hash)
  VALUES (1, 'admin', 'admin@techlogix.com', '$2a$10$Lyj.Evor/sO.3mHS7aAkm.igxVUPOksRlkjEMQ2wXX6DNGKtbYu/i');
INSERT INTO user_roles VALUES (1,1);
INSERT INTO warehouses (tenant_id, name, code) VALUES (1,'Main Warehouse','WH01');
INSERT INTO locations (tenant_id, warehouse_id, code, zone)
  VALUES (1,1,'RECV-01','RECEIVING'),(1,1,'STOR-01','STORAGE'),
         (1,1,'STOR-02','STORAGE'),(1,1,'PROD-01','PRODUCTION');
INSERT INTO products (tenant_id, code, name, base_unit)
  VALUES (1,'FAB-001','Fabric Roll','KG'),(1,'LAM-001','Laminate','IMP');
INSERT INTO handling_units (tenant_id, product_id, location_id, quantity, unit)
  VALUES (1,1,2,315,'KG'),(1,2,3,21.16,'IMP');
INSERT INTO barcodes (tenant_id, code, entity_type, entity_id)
  VALUES (1,'HU-1001','HU',1),(1,'HU-1002','HU',2);
INSERT INTO price_versions (tenant_id, product_id, price, currency, valid_from)
  VALUES (1,1,4.50,'GBP',now()),(1,2,2.75,'GBP',now());
