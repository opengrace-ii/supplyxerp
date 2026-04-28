-- Parent-child HU relationship
ALTER TABLE handling_units
  ADD COLUMN IF NOT EXISTS parent_hu_id  BIGINT REFERENCES handling_units(id),
  ADD COLUMN IF NOT EXISTS hu_level      TEXT NOT NULL DEFAULT 'UNIT'
    CHECK (hu_level IN ('PALLET','CASE','BOX','ROLL','UNIT','OTHER')),
  ADD COLUMN IF NOT EXISTS child_count   INT DEFAULT 0;
    -- Denormalised count, updated by trigger for performance

-- Index for fast parent lookup
CREATE INDEX IF NOT EXISTS idx_hu_parent
  ON handling_units(parent_hu_id)
  WHERE parent_hu_id IS NOT NULL;

-- Auto-update child_count on parent when a child is added/removed
CREATE OR REPLACE FUNCTION update_hu_child_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Child changed parent
    IF OLD.parent_hu_id IS NOT NULL THEN
      UPDATE handling_units SET child_count = child_count - 1
        WHERE id = OLD.parent_hu_id;
    END IF;
    IF NEW.parent_hu_id IS NOT NULL THEN
      UPDATE handling_units SET child_count = child_count + 1
        WHERE id = NEW.parent_hu_id;
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.parent_hu_id IS NOT NULL THEN
    UPDATE handling_units SET child_count = child_count + 1
      WHERE id = NEW.parent_hu_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hu_child_count ON handling_units;
CREATE TRIGGER trg_hu_child_count
  AFTER INSERT OR UPDATE OF parent_hu_id ON handling_units
  FOR EACH ROW EXECUTE FUNCTION update_hu_child_count();
