-- Migration: Add missing apartment columns for seed script compatibility
-- Date: 2025-10-24
-- Purpose: Add columns that seed scripts expect but don't exist in current schema

-- Add balcony column (0 = no, 1 = yes for compatibility)
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS balcony smallint DEFAULT 0 CHECK (balcony IN (0, 1));

-- Add kitchen column (0 = no, 1 = yes)
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS kitchen smallint DEFAULT 1 CHECK (kitchen IN (0, 1));

-- Add price_huf as alias for monthly_rent_huf (for backward compatibility)
-- Note: We'll use a view or just map it in the seed script instead
-- to avoid duplication

-- Add furnishing as text (furnished/unfurnished/partially_furnished)
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS furnishing text DEFAULT 'unfurnished' 
CHECK (furnishing IN ('furnished', 'unfurnished', 'partially_furnished'));

-- Add floor_number as alias for floor
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS floor_number smallint;

-- Add elevator as text (yes/no/under_construction)
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS elevator text DEFAULT 'no' 
CHECK (elevator IN ('yes', 'no', 'under_construction'));

-- Add indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_apartments_balcony ON apartments(balcony) WHERE balcony = 1;
CREATE INDEX IF NOT EXISTS idx_apartments_furnishing ON apartments(furnishing);
CREATE INDEX IF NOT EXISTS idx_apartments_elevator ON apartments(elevator) WHERE elevator = 'yes';

-- Add comments
COMMENT ON COLUMN apartments.balcony IS 'Has balcony: 0 = no, 1 = yes';
COMMENT ON COLUMN apartments.kitchen IS 'Has kitchen: 0 = no, 1 = yes';
COMMENT ON COLUMN apartments.furnishing IS 'Furnishing status: furnished, unfurnished, or partially_furnished';
COMMENT ON COLUMN apartments.floor_number IS 'Floor number (same as floor column, for compatibility)';
COMMENT ON COLUMN apartments.elevator IS 'Elevator availability: yes, no, or under_construction';

-- Create trigger to sync floor_number with floor
CREATE OR REPLACE FUNCTION sync_floor_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Sync floor_number with floor
  IF NEW.floor IS NOT NULL THEN
    NEW.floor_number := NEW.floor;
  ELSIF NEW.floor_number IS NOT NULL THEN
    NEW.floor := NEW.floor_number;
  END IF;
  
  -- Sync has_elevator with elevator text
  IF NEW.elevator = 'yes' THEN
    NEW.has_elevator := true;
  ELSIF NEW.elevator = 'no' THEN
    NEW.has_elevator := false;
  END IF;
  
  -- Sync furnished boolean with furnishing text
  IF NEW.furnishing = 'furnished' THEN
    NEW.furnished := true;
  ELSE
    NEW.furnished := false;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_apartment_columns ON apartments;
CREATE TRIGGER trg_sync_apartment_columns
  BEFORE INSERT OR UPDATE ON apartments
  FOR EACH ROW
  EXECUTE FUNCTION sync_floor_number();

-- Migrate existing data
UPDATE apartments SET 
  furnishing = CASE WHEN furnished = true THEN 'furnished' ELSE 'unfurnished' END,
  elevator = CASE WHEN has_elevator = true THEN 'yes' ELSE 'no' END,
  floor_number = floor
WHERE furnishing IS NULL OR elevator IS NULL OR floor_number IS NULL;
