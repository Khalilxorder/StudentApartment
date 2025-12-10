-- FILE: utils/neighborhood-data-migration.sql
-- Migration to add neighborhood data fields to apartments table

-- Add neighborhood data columns
ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS transit_score INTEGER CHECK (transit_score >= 0 AND transit_score <= 100),
ADD COLUMN IF NOT EXISTS bike_score INTEGER CHECK (bike_score >= 0 AND bike_score <= 100),
ADD COLUMN IF NOT EXISTS nearby_restaurants_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_grocery_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_shopping_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_cafes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_gyms_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_parks_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_schools_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS nearby_hospitals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS neighborhood_price_trend TEXT CHECK (neighborhood_price_trend IN ('up', 'down', 'stable')),
ADD COLUMN IF NOT EXISTS neighborhood_price_change_percent DECIMAL(5,2);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apartments_transit_score ON apartments(transit_score);
CREATE INDEX IF NOT EXISTS idx_apartments_bike_score ON apartments(bike_score);
CREATE INDEX IF NOT EXISTS idx_apartments_walkability_score ON apartments(walkability_score);
CREATE INDEX IF NOT EXISTS idx_apartments_safety_score ON apartments(safety_score);

-- Add comments for documentation
COMMENT ON COLUMN apartments.transit_score IS 'Transit score from Walk Score API (0-100)';
COMMENT ON COLUMN apartments.bike_score IS 'Bike score from Walk Score API (0-100)';
COMMENT ON COLUMN apartments.nearby_restaurants_count IS 'Number of restaurants within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_grocery_count IS 'Number of grocery stores within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_shopping_count IS 'Number of shopping centers within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_cafes_count IS 'Number of cafes within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_gyms_count IS 'Number of gyms within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_parks_count IS 'Number of parks within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_schools_count IS 'Number of schools within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.nearby_hospitals_count IS 'Number of hospitals within 1.5km from Google Places API';
COMMENT ON COLUMN apartments.neighborhood_price_trend IS 'Price trend direction: up, down, or stable';
COMMENT ON COLUMN apartments.neighborhood_price_change_percent IS 'Percentage change in neighborhood prices';