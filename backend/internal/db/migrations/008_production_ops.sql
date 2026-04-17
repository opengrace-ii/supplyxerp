-- Production Operations Schema Verification
-- Ensures handling_units has all required fields for split/consume lineage.

ALTER TABLE handling_units
  ADD COLUMN IF NOT EXISTS consumed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consumed_by    BIGINT REFERENCES users(id) ON DELETE SET NULL;

-- Index for lineage queries (find all children of a parent HU)
CREATE INDEX IF NOT EXISTS idx_hu_parent ON handling_units(parent_hu_id) WHERE parent_hu_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hu_status_zone ON handling_units(status, zone_id);

-- Add MOVE, CONSUME, SPLIT event context columns to inventory_events
ALTER TABLE inventory_events
  ADD COLUMN IF NOT EXISTS from_zone_id   BIGINT REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS to_zone_id     BIGINT REFERENCES zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- View: HU lineage tree (parent → children → grandchildren)
CREATE OR REPLACE VIEW v_hu_lineage AS
WITH RECURSIVE lineage AS (
  -- Anchor: root HUs (no parent)
  SELECT
    id, code AS hu_code, parent_hu_id, product_id, quantity, unit AS base_unit,
    status, zone_id, site_id, label_version, created_at,
    0 AS depth,
    ARRAY[id] AS path
  FROM handling_units
  WHERE parent_hu_id IS NULL

  UNION ALL

  -- Recursive: children
  SELECT
    hu.id, hu.code AS hu_code, hu.parent_hu_id, hu.product_id, hu.quantity,
    hu.unit AS base_unit, hu.status, hu.zone_id, hu.site_id, hu.label_version,
    hu.created_at,
    l.depth + 1,
    l.path || hu.id
  FROM handling_units hu
  JOIN lineage l ON l.id = hu.parent_hu_id
)
SELECT
  l.*,
  p.code  AS product_code,
  p.name  AS product_name,
  z.code  AS zone_code,
  z.zone_type
FROM lineage l
JOIN products p ON p.id = l.product_id
LEFT JOIN zones z ON z.id = l.zone_id;
