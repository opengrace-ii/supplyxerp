-- ─── STOCK VIEWS ──────────────────────────────────────────────────────────────
-- These views are the ONLY authoritative source of stock balance.
-- Never add a balance column to any table. Query these views.

-- 1. NORMALIZE HU STATUSES
-- The system was previously using 'AVAILABLE'. Normalizing to 'IN_STOCK' to match views.
UPDATE handling_units SET status = 'IN_STOCK' WHERE status = 'AVAILABLE';

-- 2. PRIMARY STOCK LEDGER VIEW
-- Current stock on hand per product per zone
CREATE OR REPLACE VIEW v_stock_on_hand AS
SELECT
  ie.tenant_id,
  hu.product_id,
  p.code           AS product_code,
  p.name           AS product_name,
  p.base_unit,
  hu.zone_id,
  z.code           AS zone_code,
  z.name           AS zone_name,
  z.zone_type,
  hu.site_id,
  s.code           AS site_code,
  s.name           AS site_name,
  COUNT(DISTINCT hu.id)       AS hu_count,
  SUM(ie.quantity)            AS quantity_on_hand,
  MAX(ie.created_at)          AS last_movement_at
FROM inventory_events ie
JOIN handling_units  hu ON hu.id = ie.hu_id
JOIN products        p  ON p.id  = hu.product_id
JOIN zones           z  ON z.id  = hu.zone_id
JOIN sites           s  ON s.id  = hu.site_id
WHERE hu.status = 'IN_STOCK'
  AND p.is_active = true
GROUP BY
  ie.tenant_id, hu.product_id, p.code, p.name, p.base_unit,
  hu.zone_id, z.code, z.name, z.zone_type,
  hu.site_id, s.code, s.name;

-- 3. PRODUCT STOCK SUMMARY
-- Collapsed across all zones
CREATE OR REPLACE VIEW v_product_stock_summary AS
SELECT
  tenant_id,
  product_id,
  product_code,
  product_name,
  base_unit,
  SUM(quantity_on_hand)  AS total_quantity,
  SUM(hu_count)          AS total_hu_count,
  COUNT(DISTINCT zone_id) AS zone_count,
  MAX(last_movement_at)  AS last_movement_at
FROM v_stock_on_hand
GROUP BY tenant_id, product_id, product_code, product_name, base_unit;

-- 4. HU MOVEMENT HISTORY
-- Event ledger per HU
CREATE OR REPLACE VIEW v_hu_movement_history AS
SELECT
  ie.tenant_id,
  ie.hu_id,
  hu.code      AS hu_code,
  ie.event_type,
  ie.quantity,
  hu.unit      AS base_unit,
  ie.zone_id,
  z.code       AS zone_code,
  z.zone_type,
  ie.site_id,
  s.code       AS site_code,
  ie.metadata->>'reference_type' AS reference_type,
  ie.metadata->>'reference_id'   AS reference_id,
  ie.created_at,
  ie.actor_user_id AS created_by
FROM inventory_events ie
JOIN handling_units hu ON hu.id = ie.hu_id
LEFT JOIN zones     z  ON z.id  = ie.zone_id
LEFT JOIN sites     s  ON s.id  = ie.site_id;

-- 5. ZONE STOCK SNAPSHOT
CREATE OR REPLACE VIEW v_zone_stock AS
SELECT
  soh.tenant_id,
  soh.zone_id,
  soh.zone_code,
  soh.zone_name,
  soh.zone_type,
  soh.site_id,
  soh.site_code,
  COUNT(DISTINCT soh.product_id)  AS product_count,
  SUM(soh.hu_count)               AS hu_count,
  COALESCE(SUM(soh.quantity_on_hand), 0) AS total_quantity,
  jsonb_agg(jsonb_build_object(
    'product_id',   soh.product_id,
    'product_code', soh.product_code,
    'product_name', soh.product_name,
    'quantity',     soh.quantity_on_hand,
    'unit',         soh.base_unit,
    'hu_count',     soh.hu_count
  )) FILTER (WHERE soh.product_id IS NOT NULL) AS products
FROM v_stock_on_hand soh
GROUP BY
  soh.tenant_id, soh.zone_id, soh.zone_code, soh.zone_name,
  soh.zone_type, soh.site_id, soh.site_code;

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_inventory_events_hu_created
  ON inventory_events(hu_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_events_tenant_type
  ON inventory_events(tenant_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_handling_units_product_zone
  ON handling_units(product_id, zone_id, status);
