-- Migration 035: Material Master Foundation (SAP-aligned)
-- Enhances products table with planning, procurement, and shelf life fields.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS material_category    TEXT DEFAULT 'RAW_MATERIAL', -- RAW_MATERIAL, FINISHED_GOOD, CONSUMABLE, SERVICE_ITEM
  ADD COLUMN IF NOT EXISTS product_group         TEXT,
  ADD COLUMN IF NOT EXISTS procurement_type      TEXT DEFAULT 'EXTERNAL',     -- EXTERNAL, INTERNAL, BOTH
  ADD COLUMN IF NOT EXISTS planning_method       TEXT DEFAULT 'MANUAL',       -- MANUAL, REORDER_POINT, MRP, KANBAN
  ADD COLUMN IF NOT EXISTS reorder_point         NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_stock          NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_lot_size          NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_lot_size          NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_delivery_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_house_lead_days    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_unit         TEXT,
  ADD COLUMN IF NOT EXISTS gr_processing_days    INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_tracked         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS storage_conditions    TEXT,
  ADD COLUMN IF NOT EXISTS shelf_life_days       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_remaining_shelf_life_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_control         TEXT DEFAULT 'STANDARD', -- STANDARD, MOVING_AVG
  ADD COLUMN IF NOT EXISTS standard_price        NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_unit            TEXT,
  ADD COLUMN IF NOT EXISTS min_order_quantity    NUMERIC(15,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_check    TEXT DEFAULT 'ALWAYS';

-- Add indexes for common planning queries
CREATE INDEX IF NOT EXISTS idx_products_material_category ON products(tenant_id, material_category);
CREATE INDEX IF NOT EXISTS idx_products_procurement_type ON products(tenant_id, procurement_type);
CREATE INDEX IF NOT EXISTS idx_products_planning_method ON products(tenant_id, planning_method);
