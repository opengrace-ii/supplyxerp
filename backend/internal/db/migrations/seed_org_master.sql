-- Seed companies from organisations
INSERT INTO companies (
    tenant_id, 
    code, 
    name, 
    legal_name, 
    currency_code, 
    fiscal_year_start, 
    is_active,
    country_code
)
SELECT 
    tenant_id, 
    SUBSTRING(name FROM 1 FOR 10), -- Use first 10 chars as code if missing
    name, 
    legal_name, 
    currency, 
    fiscal_year_start, 
    is_active,
    'GB' -- Default for TechLogix
FROM organisations
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Update sites to link to the first company found for the tenant
UPDATE sites s
SET company_id = (
    SELECT id FROM companies c 
    WHERE c.tenant_id = s.tenant_id 
    LIMIT 1
)
WHERE s.company_id IS NULL;
