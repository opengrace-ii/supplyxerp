BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- SUPPLY PACTS (replaces SAP Scheduling Agreements + Contracts)
-- A Supply Pact is a long-term agreement with a supplier —
-- either for a fixed delivery schedule or a capped total value.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supply_pacts (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pact_number      VARCHAR(30) UNIQUE NOT NULL,
    -- Auto-generated: PACT-2026-00001
    pact_type        VARCHAR(20) NOT NULL,
    -- 'SCHEDULE'  = delivery on agreed dates (like scheduling agreement)
    -- 'VOLUME'    = fixed total quantity cap (like quantity contract)
    -- 'SPEND_CAP' = fixed total value cap (like value contract)
    supplier_id      BIGINT NOT NULL REFERENCES suppliers(id),
    status           VARCHAR(20) DEFAULT 'DRAFT',
    -- DRAFT, ACTIVE, FULFILLED, EXPIRED, CANCELLED
    validity_start   DATE NOT NULL,
    validity_end     DATE NOT NULL,
    currency         VARCHAR(3) DEFAULT 'USD',
    target_value     NUMERIC(18,2),   -- for SPEND_CAP type
    target_qty       NUMERIC(15,3),   -- for VOLUME type
    target_unit      VARCHAR(6),
    released_value   NUMERIC(18,2) DEFAULT 0,
    released_qty     NUMERIC(15,3) DEFAULT 0,
    payment_terms    VARCHAR(50),
    incoterms        VARCHAR(10),
    incoterms_place  VARCHAR(80),
    notes            TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_pact_lines (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pact_id          BIGINT NOT NULL REFERENCES supply_pacts(id) ON DELETE CASCADE,
    line_no          INT NOT NULL,
    material_id      BIGINT REFERENCES products(id),
    description      TEXT,
    target_qty       NUMERIC(15,3),
    unit_of_measure  VARCHAR(6),
    agreed_price     NUMERIC(18,4),
    currency         VARCHAR(3),
    released_qty     NUMERIC(15,3) DEFAULT 0,
    open_qty         NUMERIC(15,3) GENERATED ALWAYS AS
                       (COALESCE(target_qty,0) - COALESCE(released_qty,0)) STORED,
    UNIQUE (pact_id, line_no)
);

-- Delivery schedule for SCHEDULE type pacts
CREATE TABLE IF NOT EXISTS supply_pact_schedule (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pact_id          BIGINT NOT NULL REFERENCES supply_pacts(id) ON DELETE CASCADE,
    line_no          INT NOT NULL,
    delivery_date    DATE NOT NULL,
    scheduled_qty    NUMERIC(15,3) NOT NULL,
    received_qty     NUMERIC(15,3) DEFAULT 0,
    status           VARCHAR(20) DEFAULT 'PENDING'
    -- PENDING, PARTIAL, COMPLETE, OVERDUE
);

-- Deal Releases: when a PO is created against a Supply Pact
CREATE TABLE IF NOT EXISTS supply_pact_releases (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pact_id          BIGINT NOT NULL REFERENCES supply_pacts(id),
    pact_line_no     INT NOT NULL,
    po_id            BIGINT REFERENCES purchase_orders(id),
    released_qty     NUMERIC(15,3),
    released_value   NUMERIC(18,2),
    release_date     DATE DEFAULT CURRENT_DATE,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- VENDOR SCORECARD (replaces SAP Supplier Evaluation ME61)
-- Score suppliers on Price, Delivery, Quality, Responsiveness.
-- No manual criteria codes — fixed meaningful dimensions.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vendor_scorecards (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supplier_id      BIGINT NOT NULL REFERENCES suppliers(id),
    period_start     DATE NOT NULL,
    period_end       DATE NOT NULL,
    -- Scores 0-100 per dimension
    price_score      NUMERIC(5,1) DEFAULT 0,
    -- Is supplier price competitive vs market?
    delivery_score   NUMERIC(5,1) DEFAULT 0,
    -- On-time delivery rate
    quality_score    NUMERIC(5,1) DEFAULT 0,
    -- Rejection/complaint rate inverted
    response_score   NUMERIC(5,1) DEFAULT 0,
    -- Speed of confirmations and communication
    overall_score    NUMERIC(5,1) GENERATED ALWAYS AS (
        ROUND((price_score * 0.25 +
               delivery_score * 0.35 +
               quality_score * 0.30 +
               response_score * 0.10)::numeric, 1)
    ) STORED,
    -- Calculated from: delivery=35%, quality=30%, price=25%, response=10%
    -- (weights reflect what actually hurts operations most)
    price_notes      TEXT,
    delivery_notes   TEXT,
    quality_notes    TEXT,
    response_notes   TEXT,
    evaluated_by     VARCHAR(100),
    auto_calculated  BOOLEAN DEFAULT false,
    -- true = system calculated from actual GR/delivery data
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (supplier_id, period_start, period_end)
);

-- ═══════════════════════════════════════════════════════════════
-- PRICE FORMULAS (replaces SAP Pricing Procedure / Condition Types)
-- A Price Formula defines how the final price is calculated from
-- base price + adjustments. Plain English throughout.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS price_formulas (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name             VARCHAR(80) UNIQUE NOT NULL,
    -- e.g. "Standard Import Formula", "Local Purchase Formula"
    description      TEXT,
    is_default       BOOLEAN DEFAULT false,
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_rules (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    formula_id       BIGINT NOT NULL REFERENCES price_formulas(id) ON DELETE CASCADE,
    sequence         INT NOT NULL,
    -- display and calculation order
    rule_name        VARCHAR(60) NOT NULL,
    -- plain English: "Base Price", "Trade Discount", "Freight", "Tax"
    rule_type        VARCHAR(20) NOT NULL,
    -- 'BASE'       = the starting price
    -- 'DISCOUNT'   = reduces price (percentage or fixed)
    -- 'SURCHARGE'  = increases price (percentage or fixed)
    -- 'FREIGHT'    = shipping cost (per unit or fixed)
    -- 'TAX'        = tax applied to subtotal
    -- 'SUBTOTAL'   = display-only subtotal line
    calc_method      VARCHAR(10) NOT NULL,
    -- 'PCT'   = percentage of a reference step
    -- 'FIXED' = fixed amount
    -- 'QTY'   = per unit of measure
    from_step        INT,
    -- which subtotal to base this on (null = base price)
    sign             VARCHAR(1) DEFAULT '+',
    -- '+' adds, '-' deducts
    is_mandatory     BOOLEAN DEFAULT true,
    is_statistical   BOOLEAN DEFAULT false,
    -- statistical = shown but not included in final price
    UNIQUE (formula_id, sequence)
);

-- Condition records: actual values per supplier or material
CREATE TABLE IF NOT EXISTS price_rule_records (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_id          BIGINT NOT NULL REFERENCES price_rules(id) ON DELETE CASCADE,
    supplier_id      BIGINT REFERENCES suppliers(id),
    material_id      BIGINT REFERENCES products(id),
    valid_from       DATE NOT NULL,
    valid_to         DATE,
    amount           NUMERIC(18,4),
    -- for PCT: percentage value (e.g. 5.0 = 5%)
    -- for FIXED/QTY: currency amount
    currency         VARCHAR(3),
    per_qty          NUMERIC(10,3) DEFAULT 1,
    unit_of_measure  VARCHAR(6),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- DOCUMENT DISPATCH (replaces SAP Output/Message determination)
-- Controls how and when documents are sent to suppliers.
-- Simple: PO → method → status. No schemas, no condition tables.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS document_dispatches (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_type    VARCHAR(20) NOT NULL,
    -- 'PURCHASE_ORDER', 'SUPPLY_PACT', 'DEAL_RELEASE', 'GOODS_RECEIPT_NOTE'
    document_id      BIGINT NOT NULL,
    supplier_id      BIGINT REFERENCES suppliers(id),
    dispatch_method  VARCHAR(10) NOT NULL,
    -- 'EMAIL', 'PDF', 'EDI', 'WHATSAPP', 'PORTAL'
    status           VARCHAR(15) DEFAULT 'PENDING',
    -- PENDING, SENT, FAILED, ACKNOWLEDGED
    sent_at          TIMESTAMPTZ,
    acknowledged_at  TIMESTAMPTZ,
    recipient        VARCHAR(200),
    -- email address, phone, EDI partner ID
    subject          VARCHAR(200),
    body_preview     TEXT,
    -- first 500 chars of the document body
    error_message    TEXT,
    retry_count      INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Dispatch rules: auto-trigger dispatch when a document is created/changed
CREATE TABLE IF NOT EXISTS dispatch_rules (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    document_type    VARCHAR(20) NOT NULL,
    trigger_event    VARCHAR(20) NOT NULL,
    -- 'ON_CREATE', 'ON_APPROVE', 'ON_CHANGE', 'MANUAL'
    dispatch_method  VARCHAR(10) NOT NULL,
    supplier_id      BIGINT REFERENCES suppliers(id),
    -- NULL = applies to all suppliers
    is_active        BOOLEAN DEFAULT true,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default formulas
INSERT INTO price_formulas (name, description, is_default, is_active) VALUES
    ('Standard Import Formula',
     'Base price + freight + import duty. Suitable for international purchases.',
     true, true),
    ('Local Purchase Formula',
     'Base price + optional trade discount + local tax.',
     false, true),
    ('Service Formula',
     'Rate-based pricing for services and maintenance.',
     false, true)
ON CONFLICT (name) DO NOTHING;

-- Seed rules for Standard Import Formula
WITH f AS (SELECT id FROM price_formulas WHERE name = 'Standard Import Formula')
INSERT INTO price_rules (formula_id, sequence, rule_name, rule_type, calc_method, sign, is_mandatory)
SELECT f.id, seq, rname, rtype, method, sign, mandatory
FROM f, (VALUES
    (10, 'Base Price',       'BASE',      'QTY', '+', true),
    (20, 'Trade Discount',   'DISCOUNT',  'PCT', '-', false),
    (30, 'Net Price',        'SUBTOTAL',  'PCT', '+', false),
    (40, 'Freight',          'FREIGHT',   'QTY', '+', false),
    (50, 'Import Duty',      'SURCHARGE', 'PCT', '+', false),
    (60, 'Landed Cost',      'SUBTOTAL',  'PCT', '+', false),
    (70, 'Tax',              'TAX',       'PCT', '+', false),
    (80, 'Final Price',      'SUBTOTAL',  'PCT', '+', false)
) AS v(seq, rname, rtype, method, sign, mandatory)
ON CONFLICT DO NOTHING;

-- Seed default dispatch rule: email PO on create
INSERT INTO dispatch_rules (document_type, trigger_event, dispatch_method, is_active)
VALUES ('PURCHASE_ORDER', 'ON_CREATE', 'EMAIL', false)
ON CONFLICT DO NOTHING;

COMMIT;
