-- Migration: 014_rfq_schema_fix.sql

-- Add missing columns to rfq_documents
ALTER TABLE rfq_documents
  ADD COLUMN IF NOT EXISTS finalised_by BIGINT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS finalised_at TIMESTAMPTZ;

-- Add missing columns to rfq_vendors
ALTER TABLE rfq_vendors
  ADD COLUMN IF NOT EXISTS quote_received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_selected BOOLEAN NOT NULL DEFAULT false;

-- Add notified_at if missing (it's already there but just in case)
-- (It's already in the table scan earlier)
