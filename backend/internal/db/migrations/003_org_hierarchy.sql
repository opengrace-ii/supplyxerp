-- ERPLite Org Hierarchy Migration
-- Adds organisations → sites → zones (replaces flat locations table)
-- Non-destructive: existing locations rows migrated to zones

-- ORGANISATIONS (= SAP Company Code / legal-financial boundary)
CREATE TABLE IF NOT EXISTS organisations (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id         BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  public_id         UUID DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  legal_name        TEXT,           -- for invoicing and compliance documents
  currency          CHAR(3) NOT NULL DEFAULT 'USD',
  fiscal_year_start INT NOT NULL DEFAULT 1,  -- 1 = January
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_organisations_tenant ON organisations(tenant_id);

-- SITES (= SAP Plant / physical location)
CREATE TABLE IF NOT EXISTS sites (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organisation_id BIGINT NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  public_id       UUID DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,    -- e.g. SITE-UK-01
  name            TEXT NOT NULL,
  address         JSONB,            -- structured, not normalised
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);
CREATE INDEX idx_sites_tenant ON sites(tenant_id);
CREATE INDEX idx_sites_organisation ON sites(organisation_id);

-- ZONES (= SAP Storage Location / operational area within a site)
-- Replaces and supersedes the 'locations' table
CREATE TABLE IF NOT EXISTS zones (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id     BIGINT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  public_id   UUID DEFAULT gen_random_uuid(),
  code        TEXT NOT NULL,    -- e.g. RECV-01, STOR-A, PROD-LINE-1
  name        TEXT NOT NULL,
  zone_type   TEXT NOT NULL CHECK (zone_type IN ('RECEIVING','STORAGE','PRODUCTION','DISPATCH','QC')),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, code)
);
CREATE INDEX idx_zones_tenant ON zones(tenant_id);
CREATE INDEX idx_zones_site ON zones(site_id);

-- ADD site_id + zone_id to all operational tables
ALTER TABLE handling_units
  ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS zone_id BIGINT REFERENCES zones(id) ON DELETE RESTRICT;

ALTER TABLE inventory_events
  ADD COLUMN IF NOT EXISTS site_id BIGINT REFERENCES sites(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS zone_id BIGINT REFERENCES zones(id) ON DELETE RESTRICT;

ALTER TABLE warehouse_tasks
  ADD COLUMN IF NOT EXISTS from_site_id BIGINT REFERENCES sites(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS from_zone_id BIGINT REFERENCES zones(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS to_site_id   BIGINT REFERENCES sites(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS to_zone_id   BIGINT REFERENCES zones(id) ON DELETE RESTRICT;

-- MIGRATE existing locations rows → zones
-- (Requires a default org and site to exist — see auto-provisioning below)
-- This INSERT runs AFTER the seed auto-provisioning function creates the default site.
-- It is idempotent: ON CONFLICT DO NOTHING.
INSERT INTO zones (tenant_id, site_id, code, name, zone_type)
SELECT
  l.tenant_id,
  s.id AS site_id,
  l.code,
  l.name,
  CASE
    WHEN l.code ILIKE '%RECV%' THEN 'RECEIVING'
    WHEN l.code ILIKE '%PROD%' THEN 'PRODUCTION'
    WHEN l.code ILIKE '%DISP%' OR l.code ILIKE '%SHIP%' THEN 'DISPATCH'
    WHEN l.code ILIKE '%QC%'   THEN 'QC'
    ELSE 'STORAGE'
  END AS zone_type
FROM locations l
JOIN sites s ON s.tenant_id = l.tenant_id
ON CONFLICT (site_id, code) DO NOTHING;

-- Update handling_units.zone_id from migrated zones
UPDATE handling_units hu
SET zone_id = z.id,
    site_id = z.site_id
FROM zones z
JOIN locations l ON l.code = z.code AND l.tenant_id = z.tenant_id
WHERE hu.location_id = l.id
  AND hu.zone_id IS NULL;
