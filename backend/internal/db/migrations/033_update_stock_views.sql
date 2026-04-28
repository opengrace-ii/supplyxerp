-- Update stock views to be stock_type aware and event-type filtered
-- CRITICAL: Only sum balance-changing events (not PUTAWAY/MOVE/HU_MOVED)
-- PUTAWAY events duplicate GR quantity in the old view causing the mismatch.

-- Drop dependents first
DROP VIEW IF EXISTS v_zone_stock CASCADE;
DROP VIEW IF EXISTS v_product_stock_summary CASCADE;
DROP VIEW IF EXISTS v_stock_on_hand CASCADE;

-- 1. PRIMARY STOCK LEDGER VIEW
--    Only GR/GI/ADJUST/CONSUME/SPLIT events change the balance.
--    PUTAWAY, MOVE, HU_MOVED, ZONE_TRANSFER are location events (qty=0 conceptually).
CREATE VIEW v_stock_on_hand AS
SELECT
  ie.tenant_id,
  hu.product_id,
  p.code        AS product_code,
  p.name        AS product_name,
  p.base_unit,
  hu.zone_id,
  z.code        AS zone_code,
  z.name        AS zone_name,
  z.zone_type,
  hu.site_id,
  s.code        AS site_code,
  s.name        AS site_name,
  ie.stock_type,
  COUNT(DISTINCT hu.id)  AS hu_count,
  SUM(ie.quantity)       AS quantity_on_hand,
  MAX(ie.created_at)     AS last_movement_at
FROM inventory_events ie
JOIN handling_units hu ON hu.id = ie.hu_id
JOIN products       p  ON p.id  = hu.product_id
JOIN zones          z  ON z.id  = hu.zone_id
JOIN sites          s  ON s.id  = hu.site_id
WHERE
  hu.status       = 'IN_STOCK'
  AND p.is_active = true
  AND ie.event_type IN ('GR','GI','ADJUST','CONSUME','SPLIT_DEBIT','SPLIT_CREDIT')
GROUP BY
  ie.tenant_id, hu.product_id, p.code, p.name, p.base_unit,
  hu.zone_id, z.code, z.name, z.zone_type,
  hu.site_id, s.code, s.name, ie.stock_type;

-- 2. PRODUCT STOCK SUMMARY (aggregates across all zones)
CREATE VIEW v_product_stock_summary AS
SELECT
  tenant_id,
  product_id,
  product_code,
  product_name,
  base_unit,
  COUNT(DISTINCT zone_id)   AS zone_count,
  SUM(hu_count)             AS total_hu_count,
  SUM(quantity_on_hand)     AS total_quantity,
  MAX(last_movement_at)     AS last_movement_at
FROM v_stock_on_hand
GROUP BY tenant_id, product_id, product_code, product_name, base_unit;

-- 3. ZONE STOCK SNAPSHOT (per-zone, with stock-type-aware product JSON)
--    Uses LEFT JOIN from zones so empty zones appear in the map.
CREATE VIEW v_zone_stock AS
SELECT
  z.id            AS zone_id,
  z.code          AS zone_code,
  z.name          AS zone_name,
  z.zone_type,
  s.id            AS site_id,
  s.code          AS site_code,
  z.tenant_id,
  COALESCE(COUNT(DISTINCT v.product_id), 0)  AS product_count,
  COALESCE(SUM(v.hu_count), 0)               AS hu_count,
  COALESCE(SUM(v.quantity_on_hand), 0)       AS total_quantity,
  COALESCE(
    jsonb_agg(jsonb_build_object(
      'product_id',   v.product_id,
      'product_code', v.product_code,
      'stock_type',   v.stock_type,
      'quantity',     v.quantity_on_hand
    )) FILTER (WHERE v.product_id IS NOT NULL),
    '[]'::jsonb
  ) AS products
FROM zones z
JOIN sites s ON s.id = z.site_id
LEFT JOIN v_stock_on_hand v ON v.zone_id = z.id
GROUP BY z.id, z.code, z.name, z.zone_type, s.id, s.code, z.tenant_id;

-- 4. HU MOVEMENT HISTORY (stock_type aware)
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
  ie.stock_type,
  ie.metadata->>'reference_type' AS reference_type,
  ie.metadata->>'reference_id'   AS reference_id,
  ie.created_at,
  ie.actor_user_id AS created_by
FROM inventory_events ie
JOIN handling_units hu ON hu.id = ie.hu_id
LEFT JOIN zones     z  ON z.id  = ie.zone_id
LEFT JOIN sites     s  ON s.id  = ie.site_id;