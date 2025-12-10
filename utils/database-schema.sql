-- FILE: utils/database-schema.sql
-- Enhanced database schema for LLM-based apartment search
-- Run this migration to add new fields to apartments table

-- Add new columns for detailed apartment specifications
ALTER TABLE apartments 
ADD COLUMN IF NOT EXISTS size_sqm INTEGER,
ADD COLUMN IF NOT EXISTS floor_number INTEGER,
ADD COLUMN IF NOT EXISTS total_floors INTEGER,
ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS smoking_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS utilities_included TEXT[],
ADD COLUMN IF NOT EXISTS amenities TEXT[],
ADD COLUMN IF NOT EXISTS building_age INTEGER,
ADD COLUMN IF NOT EXISTS distance_to_metro_m INTEGER,
ADD COLUMN IF NOT EXISTS distance_to_university_m INTEGER,
ADD COLUMN IF NOT EXISTS neighborhood_tags TEXT[],
ADD COLUMN IF NOT EXISTS lease_min_months INTEGER,
ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS heating_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS cooling_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS internet_included BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS laundry_in_unit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS move_in_cost_huf INTEGER,
ADD COLUMN IF NOT EXISTS deposit_months NUMERIC(3,1);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments(price_huf);
CREATE INDEX IF NOT EXISTS idx_apartments_bedrooms ON apartments(bedrooms);
CREATE INDEX IF NOT EXISTS idx_apartments_bathrooms ON apartments(bathrooms);
CREATE INDEX IF NOT EXISTS idx_apartments_district ON apartments(district);
CREATE INDEX IF NOT EXISTS idx_apartments_available ON apartments(is_available);
CREATE INDEX IF NOT EXISTS idx_apartments_size ON apartments(size_sqm);
CREATE INDEX IF NOT EXISTS idx_apartments_pet_friendly ON apartments(pet_friendly);

-- Create composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_apartments_price_bedrooms 
ON apartments(price_huf, bedrooms) WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_apartments_district_price 
ON apartments(district, price_huf) WHERE is_available = true;

-- Add GIN index for array columns (for faster ARRAY operations)
CREATE INDEX IF NOT EXISTS idx_apartments_amenities ON apartments USING GIN(amenities);
CREATE INDEX IF NOT EXISTS idx_apartments_utilities ON apartments USING GIN(utilities_included);
CREATE INDEX IF NOT EXISTS idx_apartments_neighborhood ON apartments USING GIN(neighborhood_tags);

-- Optional: Add pgvector extension for semantic search (requires PostgreSQL extension)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE apartments ADD COLUMN IF NOT EXISTS description_embedding VECTOR(384);
-- CREATE INDEX ON apartments USING ivfflat (description_embedding vector_cosine_ops);

-- Create a view for commonly needed apartment data
CREATE OR REPLACE VIEW apartments_search AS
SELECT 
  id,
  title,
  description,
  price_huf,
  district,
  address,
  bedrooms,
  bathrooms,
  size_sqm,
  floor_number,
  balcony,
  furnishing,
  elevator,
  pet_friendly,
  parking_available,
  amenities,
  utilities_included,
  image_urls,
  latitude,
  longitude,
  is_available,
  created_at,
  -- Calculated convenience fields
  CASE 
    WHEN price_huf < 120000 THEN 'budget'
    WHEN price_huf BETWEEN 120000 AND 180000 THEN 'moderate'
    ELSE 'premium'
  END as price_category,
  CASE 
    WHEN elevator = 'yes' OR floor_number <= 2 THEN true
    ELSE false
  END as easy_access
FROM apartments
WHERE is_available = true;

-- Add comments for documentation
COMMENT ON COLUMN apartments.size_sqm IS 'Size of apartment in square meters';
COMMENT ON COLUMN apartments.pet_friendly IS 'Whether pets are allowed';
COMMENT ON COLUMN apartments.utilities_included IS 'Array of included utilities: water, electricity, gas, internet, etc.';
COMMENT ON COLUMN apartments.amenities IS 'Array of amenities: wifi, ac, washing_machine, dishwasher, balcony, etc.';
COMMENT ON COLUMN apartments.neighborhood_tags IS 'Array of neighborhood characteristics: quiet, lively, green, central, etc.';
COMMENT ON COLUMN apartments.distance_to_metro_m IS 'Distance to nearest metro station in meters';
COMMENT ON COLUMN apartments.distance_to_university_m IS 'Distance to nearest major university in meters';

-- Create function to calculate match score (example)
CREATE OR REPLACE FUNCTION calculate_match_score(
  apt_id UUID,
  desired_price_max INTEGER,
  desired_bedrooms INTEGER,
  desired_district INTEGER
) RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
  apt apartments%ROWTYPE;
BEGIN
  SELECT * INTO apt FROM apartments WHERE id = apt_id;
  
  -- Price match (40 points max)
  IF apt.price_huf <= desired_price_max THEN
    score := score + 40;
  ELSIF apt.price_huf <= desired_price_max * 1.2 THEN
    score := score + 20;
  END IF;
  
  -- Bedroom match (30 points max)
  IF apt.bedrooms = desired_bedrooms THEN
    score := score + 30;
  ELSIF apt.bedrooms = desired_bedrooms + 1 THEN
    score := score + 20;
  END IF;
  
  -- District match (30 points max)
  IF apt.district = desired_district THEN
    score := score + 30;
  ELSIF ABS(apt.district - desired_district) <= 2 THEN
    score := score + 15;
  END IF;
  
  RETURN score;
END;
$$ LANGUAGE plpgsql;
