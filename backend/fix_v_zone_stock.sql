DROP VIEW IF EXISTS v_zone_stock CASCADE;
CREATE VIEW v_zone_stock AS
SELECT
  z.id            AS zone_id,
  z.code          AS zone_code,
  z.name          AS zone_name,
  z.zone_type,
  s.id            AS site_id,
  s.code          AS site_code,
  z.tenant_id     AS tenant_id,
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
