-- FILE: backend/migrations/013_rfq_complete.sql

-- 1. RFQ document type configuration (SAP: AN = standard, AB = GP bid)
CREATE TABLE IF NOT EXISTS rfq_document_types (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  type_code     VARCHAR(4) NOT NULL,        -- 'AN' (standard), 'AB' (GP bid)
  description   VARCHAR(100) NOT NULL,
  is_gp_bid     BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, type_code)
);

-- 2. Delivery schedule lines per RFQ line (SAP: split qty across dates)
CREATE TABLE IF NOT EXISTS rfq_delivery_schedules (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  rfq_line_id     BIGINT NOT NULL REFERENCES rfq_lines(id) ON DELETE RESTRICT,
  delivery_date   DATE NOT NULL,
  quantity        NUMERIC(15,4) NOT NULL,
  is_fixed        BOOLEAN NOT NULL DEFAULT false,  -- SAP: Fixed indicator
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Additions to rfq_documents
ALTER TABLE rfq_documents
  ADD COLUMN IF NOT EXISTS rfq_type          VARCHAR(4) NOT NULL DEFAULT 'AN',
  ADD COLUMN IF NOT EXISTS collective_number VARCHAR(30),      -- SAP: Coll.no.
  ADD COLUMN IF NOT EXISTS validity_start    DATE,
  ADD COLUMN IF NOT EXISTS validity_end      DATE,
  ADD COLUMN IF NOT EXISTS apply_by_date     DATE,            -- intent-to-quote date
  ADD COLUMN IF NOT EXISTS binding_days      INTEGER,         -- days after deadline
  ADD COLUMN IF NOT EXISTS purchasing_org_code VARCHAR(20),     -- renamed for clarity
  ADD COLUMN IF NOT EXISTS purchasing_group_code VARCHAR(10),   -- renamed for clarity
  ADD COLUMN IF NOT EXISTS your_reference    VARCHAR(100),    -- supplier's ref
  ADD COLUMN IF NOT EXISTS our_reference     VARCHAR(100),    -- buyer's ref
  ADD COLUMN IF NOT EXISTS salesperson       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS telephone         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS language_key      VARCHAR(5) DEFAULT 'EN';

-- 4. Additions to rfq_lines
ALTER TABLE rfq_lines
  ADD COLUMN IF NOT EXISTS item_category     VARCHAR(2) DEFAULT '',
  -- '' = standard, 'L' = subcontracting, 'S' = third party, 'D' = service
  ADD COLUMN IF NOT EXISTS storage_location  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS material_group    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS req_tracking_no   VARCHAR(30),     -- SAP: Req.Tracking#
  ADD COLUMN IF NOT EXISTS planned_deliv_days INTEGER,
  ADD COLUMN IF NOT EXISTS reason_for_order  VARCHAR(3),      -- SAP: OrRsn
  ADD COLUMN IF NOT EXISTS has_schedule      BOOLEAN NOT NULL DEFAULT false;

-- 5. Additions to rfq_quotation_lines (conditions: discount, freight, tax)
ALTER TABLE rfq_quotation_lines
  ADD COLUMN IF NOT EXISTS gross_price         NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS discount_pct        NUMERIC(7,4),  -- RA00: % discount
  ADD COLUMN IF NOT EXISTS discount_amount     NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS freight_value       NUMERIC(15,4), -- FRB1
  ADD COLUMN IF NOT EXISTS tax_code            VARCHAR(4),
  ADD COLUMN IF NOT EXISTS tax_amount          NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS effective_price     NUMERIC(15,4), -- net of all conditions
  ADD COLUMN IF NOT EXISTS is_rejected         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason    TEXT,
  ADD COLUMN IF NOT EXISTS rejection_sent_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pricing_steps       JSONB;         -- Store conditions breakdown

-- 6. Additions to rfq_quotations
ALTER TABLE rfq_quotations
  ADD COLUMN IF NOT EXISTS binding_until   DATE,             -- quotation validity end
  ADD COLUMN IF NOT EXISTS your_reference  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS warranty_terms  TEXT;

-- 7. Reason for order config table
CREATE TABLE IF NOT EXISTS rfq_order_reasons (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  reason_code VARCHAR(3) NOT NULL,
  description VARCHAR(100) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, reason_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rfq_documents_collective
  ON rfq_documents(tenant_id, collective_number)
  WHERE collective_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rfq_delivery_schedules_line
  ON rfq_delivery_schedules(rfq_line_id);

CREATE INDEX IF NOT EXISTS idx_rfq_quotation_lines_rejected
  ON rfq_quotation_lines(rfq_line_id, is_rejected);
