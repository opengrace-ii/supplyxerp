-- Fix column defaults to use GBP instead of USD
ALTER TABLE organisations      ALTER COLUMN currency         SET DEFAULT 'GBP';
ALTER TABLE tenant_config      ALTER COLUMN default_currency SET DEFAULT 'GBP';
ALTER TABLE supply_pacts       ALTER COLUMN currency         SET DEFAULT 'GBP';
ALTER TABLE deals              ALTER COLUMN currency         SET DEFAULT 'GBP';
ALTER TABLE sales_orders       ALTER COLUMN currency         SET DEFAULT 'GBP';
ALTER TABLE supplier_invoices  ALTER COLUMN currency         SET DEFAULT 'GBP';
ALTER TABLE purchase_orders    ALTER COLUMN currency         SET DEFAULT 'GBP';
