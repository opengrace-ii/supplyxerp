-- Migration: Rename RFQ tables to match Session B requirements
ALTER TABLE rfq_suppliers RENAME TO rfq_vendors;
ALTER TABLE rfq_quotes RENAME TO rfq_quotations;
ALTER TABLE rfq_quote_lines RENAME TO rfq_quotation_lines;

-- Update column names if necessary (checking migration 011)
-- In migration 011: rfq_quotes had rfq_supplier_id
ALTER TABLE rfq_quotations RENAME COLUMN rfq_supplier_id TO rfq_vendor_id;
-- rfq_quote_lines had quote_id
ALTER TABLE rfq_quotation_lines RENAME COLUMN quote_id TO quotation_id;
