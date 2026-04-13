-- Add missing columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom_conversions JSONB DEFAULT '[]';

-- Ensure unique constraint on product code per tenant
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_tenant_id_code_key;
ALTER TABLE products ADD CONSTRAINT products_tenant_id_code_key UNIQUE (tenant_id, code);
