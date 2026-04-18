-- FILE: backend/internal/db/migrations/015_org_master.sql
-- Purpose: Full organisational master for SupplyXERP.
-- Rule: Additive only. No DROP. No ALTER TYPE. No column renames.
-- company_id on sites is NULLABLE — existing WM sites keep organisation_id as-is.

-- ================================================================
-- 1. ENRICH tenants TABLE
-- ================================================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS legal_name         VARCHAR(200),
  ADD COLUMN IF NOT EXISTS registration_no    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_id             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tax_regime         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country_code       VARCHAR(3) DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS currency_code      VARCHAR(3) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS address_line1      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address_line2      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS city               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_province     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS website            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS logo_url           VARCHAR(500),
  ADD COLUMN IF NOT EXISTS fiscal_year_start  INTEGER DEFAULT 4,
  ADD COLUMN IF NOT EXISTS date_format        VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  ADD COLUMN IF NOT EXISTS time_zone          VARCHAR(50) DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS language_code      VARCHAR(5) DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS custom_attributes  JSONB DEFAULT '{}';

-- ================================================================
-- 2. COMPANIES TABLE (Company Code equivalent)
-- ================================================================
CREATE TABLE IF NOT EXISTS companies (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code                VARCHAR(10) NOT NULL,
  name                VARCHAR(200) NOT NULL,
  legal_name          VARCHAR(200),
  registration_no     VARCHAR(100),
  tax_id              VARCHAR(100),
  tax_regime          VARCHAR(50),
  country_code        VARCHAR(3) NOT NULL,
  currency_code       VARCHAR(3) NOT NULL,
  address_line1       VARCHAR(200),
  address_line2       VARCHAR(200),
  city                VARCHAR(100),
  state_province      VARCHAR(100),
  postal_code         VARCHAR(20),
  phone               VARCHAR(50),
  email               VARCHAR(200),
  fiscal_year_start   INTEGER DEFAULT 4,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_attributes   JSONB DEFAULT '{}',
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);

-- ================================================================
-- 3. EXPAND sites TABLE
-- ================================================================
-- company_id is NULLABLE — existing WM sites keep their organisation_id.
-- New sites created via /api/org/sites MUST supply company_id (validated in handler).
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS company_id         BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_type          VARCHAR(50) DEFAULT 'WAREHOUSE',
  ADD COLUMN IF NOT EXISTS site_purpose       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS country_code       VARCHAR(3),
  ADD COLUMN IF NOT EXISTS address_line1      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS address_line2      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS city               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state_province     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code        VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS calendar_id        BIGINT,
  ADD COLUMN IF NOT EXISTS valuation_level    VARCHAR(20) DEFAULT 'SITE',
  ADD COLUMN IF NOT EXISTS allows_negative_stock        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS goods_receipt_zone_required  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_attributes  JSONB DEFAULT '{}';

-- ================================================================
-- 4. STORAGE AREAS TABLE (No SAP equivalent — SupplyX only)
-- ================================================================
CREATE TABLE IF NOT EXISTS storage_areas (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  site_id             BIGINT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  code                VARCHAR(20) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  description         TEXT,
  area_type           VARCHAR(50) DEFAULT 'GENERAL',
  floor_level         VARCHAR(20),
  max_capacity        NUMERIC(15,4),
  capacity_unit       VARCHAR(10),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_attributes   JSONB DEFAULT '{}',
  UNIQUE(tenant_id, site_id, code)
);

CREATE INDEX IF NOT EXISTS idx_storage_areas_site ON storage_areas(site_id);

-- ================================================================
-- 5. EXPAND zones TABLE
-- ================================================================
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS storage_area_id   BIGINT REFERENCES storage_areas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS barcode            VARCHAR(100),
  ADD COLUMN IF NOT EXISTS max_weight_kg      NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS max_volume_m3      NUMERIC(15,4),
  ADD COLUMN IF NOT EXISTS temperature_min    NUMERIC(7,2),
  ADD COLUMN IF NOT EXISTS temperature_max    NUMERIC(7,2),
  ADD COLUMN IF NOT EXISTS is_quarantine      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_inspection      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_attributes  JSONB DEFAULT '{}';

-- ================================================================
-- 6. OPERATIONAL CALENDARS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS operational_calendars (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code                VARCHAR(10) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  country_code        VARCHAR(3),
  valid_from_year     INTEGER NOT NULL DEFAULT 2024,
  valid_to_year       INTEGER NOT NULL DEFAULT 2035,
  work_monday         BOOLEAN NOT NULL DEFAULT true,
  work_tuesday        BOOLEAN NOT NULL DEFAULT true,
  work_wednesday      BOOLEAN NOT NULL DEFAULT true,
  work_thursday       BOOLEAN NOT NULL DEFAULT true,
  work_friday         BOOLEAN NOT NULL DEFAULT true,
  work_saturday       BOOLEAN NOT NULL DEFAULT false,
  work_sunday         BOOLEAN NOT NULL DEFAULT false,
  daily_work_hours    NUMERIC(4,2) DEFAULT 8.0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_attributes   JSONB DEFAULT '{}',
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS calendar_exceptions (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  calendar_id         BIGINT NOT NULL REFERENCES operational_calendars(id) ON DELETE CASCADE,
  exception_date      DATE NOT NULL,
  exception_type      VARCHAR(20) NOT NULL,
  description         VARCHAR(200) NOT NULL,
  is_working_day      BOOLEAN NOT NULL,
  UNIQUE(tenant_id, calendar_id, exception_date)
);

-- Add FK now that operational_calendars exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_sites_calendar'
  ) THEN
    ALTER TABLE sites ADD CONSTRAINT fk_sites_calendar
      FOREIGN KEY (calendar_id) REFERENCES operational_calendars(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END$$;

-- ================================================================
-- 7. PROCUREMENT UNITS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS procurement_units (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id               UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id               BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code                    VARCHAR(10) NOT NULL,
  name                    VARCHAR(200) NOT NULL,
  scope_type              VARCHAR(30) NOT NULL DEFAULT 'SITE_SPECIFIC',
  company_id              BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  reference_unit_id       BIGINT REFERENCES procurement_units(id) ON DELETE SET NULL,
  can_release_orders      BOOLEAN NOT NULL DEFAULT true,
  use_reference_conditions BOOLEAN NOT NULL DEFAULT false,
  currency_code           VARCHAR(3),
  phone                   VARCHAR(50),
  email                   VARCHAR(200),
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_attributes       JSONB DEFAULT '{}',
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS procurement_unit_sites (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id             BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  procurement_unit_id   BIGINT NOT NULL REFERENCES procurement_units(id) ON DELETE CASCADE,
  site_id               BIGINT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  is_standard           BOOLEAN NOT NULL DEFAULT false,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, procurement_unit_id, site_id)
);

-- ================================================================
-- 8. PROCUREMENT TEAMS TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS procurement_teams (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id           UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id           BIGINT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code                VARCHAR(10) NOT NULL,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  phone               VARCHAR(50),
  email               VARCHAR(200),
  responsible_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  material_scope      TEXT[],
  spending_limit      NUMERIC(15,2),
  spending_currency   VARCHAR(3) DEFAULT 'INR',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_attributes   JSONB DEFAULT '{}',
  UNIQUE(tenant_id, code)
);

-- ================================================================
-- 9. WIRE PROCUREMENT TO EXISTING DOCUMENTS
-- ================================================================
ALTER TABLE rfq_documents
  ADD COLUMN IF NOT EXISTS procurement_unit_id  BIGINT REFERENCES procurement_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procurement_team_id  BIGINT REFERENCES procurement_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requesting_site_id   BIGINT REFERENCES sites(id) ON DELETE SET NULL;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS procurement_unit_id  BIGINT REFERENCES procurement_units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS procurement_team_id  BIGINT REFERENCES procurement_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivering_site_id   BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivering_zone_id   BIGINT REFERENCES zones(id) ON DELETE SET NULL;

ALTER TABLE gr_documents
  ADD COLUMN IF NOT EXISTS delivering_zone_id   BIGINT REFERENCES zones(id) ON DELETE SET NULL;

-- ================================================================
-- 10. INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_sites_company         ON sites(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sites_calendar        ON sites(calendar_id) WHERE calendar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_zones_storage_area    ON zones(storage_area_id) WHERE storage_area_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proc_units_company    ON procurement_units(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proc_unit_sites       ON procurement_unit_sites(site_id);
CREATE INDEX IF NOT EXISTS idx_proc_teams_tenant     ON procurement_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cal_exceptions_cal    ON calendar_exceptions(calendar_id, exception_date);

-- ================================================================
-- 11. SEED DATA (tenant_id = 1, TechLogix UK)
-- ================================================================
INSERT INTO operational_calendars (
  tenant_id, code, name, country_code, work_monday, work_tuesday,
  work_wednesday, work_thursday, work_friday, work_saturday, work_sunday,
  daily_work_hours, valid_from_year, valid_to_year
)
SELECT 1, 'STD', 'Standard Calendar', 'GB', true, true, true, true, true, false, false, 8.0, 2024, 2035
WHERE NOT EXISTS (
  SELECT 1 FROM operational_calendars WHERE tenant_id = 1 AND code = 'STD'
);

INSERT INTO procurement_units (
  tenant_id, code, name, scope_type, can_release_orders, currency_code, is_active
)
SELECT 1, 'PU01', 'Central Procurement', 'GROUP_WIDE', true, 'GBP', true
WHERE NOT EXISTS (
  SELECT 1 FROM procurement_units WHERE tenant_id = 1 AND code = 'PU01'
);

INSERT INTO procurement_teams (
  tenant_id, code, name, description, is_active
)
SELECT 1, 'PT01', 'General Buyers', 'Default procurement team', true
WHERE NOT EXISTS (
  SELECT 1 FROM procurement_teams WHERE tenant_id = 1 AND code = 'PT01'
);
