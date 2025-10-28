-- Add feature_ids column to apartments table
-- This stores an array of feature IDs from the 200 feature icons system

ALTER TABLE apartments
ADD COLUMN IF NOT EXISTS feature_ids TEXT[] DEFAULT '{}';

-- Create index for faster feature searches
CREATE INDEX IF NOT EXISTS idx_apartments_feature_ids ON apartments USING GIN(feature_ids);

-- Add comment explaining the column
COMMENT ON COLUMN apartments.feature_ids IS 'Array of feature IDs from the 200 feature icons system (e.g., ["loc_metro", "amen_furnished", "style_modern"])';

-- Example: Update some existing apartments with sample features
-- (In production, you'd populate these based on actual apartment attributes)

-- Example 1: Modern furnished apartment near metro
UPDATE apartments 
SET feature_ids = ARRAY[
  'loc_metro', 'loc_university', 'amen_furnished', 'amen_wifi', 
  'amen_washing_machine', 'amen_elevator', 'style_modern', 'style_renovated',
  'style_bright', 'safe_locked_entrance', 'safe_well_lit'
]::TEXT[]
WHERE bedrooms >= 1 AND monthly_rent_huf <= 120000 AND district IN ('V', 'VI', 'VII', 'VIII')
LIMIT 5;

-- Example 2: Budget-friendly student apartments
UPDATE apartments 
SET feature_ids = ARRAY[
  'loc_university', 'loc_tram', 'loc_grocery', 'amen_furnished',
  'amen_wifi', 'space_compact', 'util_low_bills', 'social_students_only',
  'legal_registered', 'legal_foreigner_friendly'
]::TEXT[]
WHERE bedrooms = 1 AND monthly_rent_huf <= 100000
LIMIT 5;

-- Example 3: Luxury apartments with amenities
UPDATE apartments 
SET feature_ids = ARRAY[
  'loc_city_center', 'loc_quiet_street', 'loc_park', 'amen_furnished',
  'amen_ac', 'amen_dishwasher', 'amen_balcony', 'amen_elevator',
  'amen_parking_garage', 'style_luxury', 'style_modern', 'style_high_ceiling',
  'safe_gated', 'safe_security_guard', 'conn_fiber', 'conn_smart_home'
]::TEXT[]
WHERE bedrooms >= 2 AND monthly_rent_huf >= 150000
LIMIT 5;

-- Example 4: Shared apartments (roommate friendly)
UPDATE apartments 
SET feature_ids = ARRAY[
  'loc_residential', 'loc_metro', 'amen_furnished', 'amen_wifi',
  'amen_washing_machine', 'social_roommates', 'social_international',
  'social_quiet', 'space_separate_rooms', 'util_individual_meters',
  'legal_registered'
]::TEXT[]
WHERE bedrooms >= 2 AND monthly_rent_huf <= 80000
LIMIT 5;

-- Create a helper function to search apartments by features
CREATE OR REPLACE FUNCTION search_apartments_by_features(
  required_features TEXT[],
  min_match_count INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  district TEXT,
  monthly_rent_huf INTEGER,
  bedrooms INTEGER,
  feature_ids TEXT[],
  match_count BIGINT,
  match_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.district,
    a.monthly_rent_huf,
    a.bedrooms,
    a.feature_ids,
    (SELECT COUNT(*) FROM unnest(a.feature_ids) f WHERE f = ANY(required_features)) as match_count,
    ROUND(
      (SELECT COUNT(*) FROM unnest(a.feature_ids) f WHERE f = ANY(required_features))::NUMERIC 
      / NULLIF(array_length(required_features, 1), 0) * 100,
      1
    ) as match_percentage
  FROM apartments a
  WHERE (
    SELECT COUNT(*) 
    FROM unnest(a.feature_ids) f 
    WHERE f = ANY(required_features)
  ) >= min_match_count
  ORDER BY match_count DESC, match_percentage DESC;
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM search_apartments_by_features(
--   ARRAY['loc_metro', 'amen_furnished', 'style_modern'],
--   2  -- minimum 2 matching features
-- );

-- Add RPC function for easier client-side querying
CREATE OR REPLACE FUNCTION get_apartments_with_feature_match(
  wished_features TEXT[],
  max_price INTEGER DEFAULT NULL,
  min_bedrooms INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      a.*,
      (SELECT COUNT(*) FROM unnest(a.feature_ids) f WHERE f = ANY(wished_features)) as matched_feature_count,
      (SELECT array_agg(f) FROM unnest(a.feature_ids) f WHERE f = ANY(wished_features)) as matched_features,
      ROUND(
        (SELECT COUNT(*) FROM unnest(a.feature_ids) f WHERE f = ANY(wished_features))::NUMERIC 
        / NULLIF(array_length(wished_features, 1), 0) * 100,
        0
      ) as feature_match_percentage
    FROM apartments a
    WHERE 
      (max_price IS NULL OR a.monthly_rent_huf <= max_price) AND
      (min_bedrooms IS NULL OR a.bedrooms >= min_bedrooms)
    ORDER BY matched_feature_count DESC, feature_match_percentage DESC
    LIMIT 50
  ) t;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Example RPC call from client:
-- const { data } = await supabase.rpc('get_apartments_with_feature_match', {
--   wished_features: ['loc_metro', 'amen_furnished', 'style_modern'],
--   max_price: 120000,
--   min_bedrooms: 1
-- });
