-- Saved Searches & Email Alerts Database Schema
-- Run this migration to create comprehensive saved search system

-- 1. SAVED_SEARCHES TABLE - User's saved search criteria
CREATE TABLE IF NOT EXISTS saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description text,

  -- Search criteria (stored as JSON for flexibility)
  search_criteria jsonb NOT NULL DEFAULT '{}',

  -- Search filters
  min_price integer,
  max_price integer,
  bedrooms integer,
  bathrooms decimal(3,1),
  min_area_sqft integer,
  max_area_sqft integer,
  property_types text[] DEFAULT '{}', -- ['apartment', 'house', 'condo', etc.]
  amenities text[] DEFAULT '{}', -- ['pool', 'gym', 'parking', etc.]

  -- Location preferences
  location_center geometry(point, 4326), -- PostGIS point for location center
  location_radius_miles decimal(5,2), -- Search radius in miles
  preferred_neighborhoods text[] DEFAULT '{}',
  zip_codes text[] DEFAULT '{}',

  -- Advanced filters
  pet_friendly boolean DEFAULT false,
  furnished boolean DEFAULT false,
  parking_available boolean DEFAULT false,
  min_lease_term_months integer,
  max_lease_term_months integer,

  -- Alert preferences
  email_alerts_enabled boolean DEFAULT true,
  alert_frequency text DEFAULT 'daily' CHECK (alert_frequency IN ('immediate', 'daily', 'weekly', 'monthly')),
  last_alert_sent_at timestamptz,
  last_search_run_at timestamptz,

  -- Search metadata
  total_results_found integer DEFAULT 0,
  new_results_since_last_view integer DEFAULT 0,
  is_active boolean DEFAULT true,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_viewed_at timestamptz
);

-- 2. SEARCH_ALERTS TABLE - Individual email alerts sent to users
CREATE TABLE IF NOT EXISTS search_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  user_id text NOT NULL,

  -- Alert content
  subject text NOT NULL,
  content text NOT NULL,
  new_apartments_count integer DEFAULT 0,

  -- Apartments included in this alert
  apartment_ids uuid[] DEFAULT '{}',

  -- Alert metadata
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,

  -- Status
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced'))
);

-- 3. SEARCH_RESULTS TABLE - Cache of search results for each saved search
CREATE TABLE IF NOT EXISTS search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,

  -- Result metadata
  relevance_score decimal(3,2), -- 0.0 to 1.0
  price_match_score decimal(3,2),
  location_match_score decimal(3,2),
  amenity_match_score decimal(3,2),

  -- When this result was first found
  first_found_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),

  -- User interaction
  viewed_at timestamptz,
  favorited_at timestamptz,
  contacted_at timestamptz,

  UNIQUE(saved_search_id, apartment_id)
);

-- 4. SEARCH_ANALYTICS TABLE - Analytics for saved search performance
CREATE TABLE IF NOT EXISTS search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  user_id text NOT NULL,

  -- Performance metrics
  total_alerts_sent integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  total_views integer DEFAULT 0,
  total_favorites integer DEFAULT 0,
  total_contacts integer DEFAULT 0,

  -- Engagement rates
  open_rate decimal(5,2) DEFAULT 0, -- percentage
  click_rate decimal(5,2) DEFAULT 0, -- percentage
  conversion_rate decimal(5,2) DEFAULT 0, -- percentage (contacts/bookings)

  -- Search effectiveness
  average_new_listings_per_alert decimal(5,2) DEFAULT 0,
  average_relevance_score decimal(3,2) DEFAULT 0,

  last_updated timestamptz DEFAULT now(),

  UNIQUE(saved_search_id)
);

-- 5. POPULAR_SEARCHES TABLE - Aggregate popular search terms and criteria
CREATE TABLE IF NOT EXISTS popular_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_term text NOT NULL,
  location text,
  search_criteria jsonb NOT NULL,

  -- Popularity metrics
  search_count integer DEFAULT 0,
  unique_users_count integer DEFAULT 0,
  average_price_min integer,
  average_price_max integer,

  -- Trending data
  is_trending boolean DEFAULT false,
  trending_score decimal(5,2) DEFAULT 0,

  last_updated timestamptz DEFAULT now(),

  UNIQUE(search_term, location)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_location_center ON saved_searches USING gist(location_center);
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_active ON saved_searches(is_active);
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_search_run ON saved_searches(last_search_run_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert_frequency ON saved_searches(alert_frequency);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_alerts_saved_search_id ON search_alerts(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_user_id ON search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_sent_at ON search_alerts(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_alerts_status ON search_alerts(status);

CREATE INDEX IF NOT EXISTS idx_search_results_saved_search_id ON search_results(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_results_apartment_id ON search_results(apartment_id);
CREATE INDEX IF NOT EXISTS idx_search_results_first_found ON search_results(first_found_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_results_relevance ON search_results(relevance_score DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_saved_search_id ON search_analytics(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_popular_searches_search_term ON popular_searches(search_term);
CREATE INDEX IF NOT EXISTS idx_popular_searches_trending ON popular_searches(is_trending, trending_score DESC);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE popular_searches ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR SAVED_SEARCHES
DROP POLICY IF EXISTS "Users can view their own saved searches" ON saved_searches;
CREATE POLICY "Users can view their own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can create their own saved searches" ON saved_searches;
CREATE POLICY "Users can create their own saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own saved searches" ON saved_searches;
CREATE POLICY "Users can update their own saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved searches" ON saved_searches;
CREATE POLICY "Users can delete their own saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS POLICIES FOR SEARCH_ALERTS
DROP POLICY IF EXISTS "Users can view their own search alerts" ON search_alerts;
CREATE POLICY "Users can view their own search alerts"
  ON search_alerts FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS POLICIES FOR SEARCH_RESULTS
DROP POLICY IF EXISTS "Users can view results for their saved searches" ON search_results;
CREATE POLICY "Users can view results for their saved searches"
  ON search_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM saved_searches
      WHERE saved_searches.id = search_results.saved_search_id
      AND saved_searches.user_id = auth.uid()::text
    )
  );

-- RLS POLICIES FOR SEARCH_ANALYTICS
DROP POLICY IF EXISTS "Users can view analytics for their saved searches" ON search_analytics;
CREATE POLICY "Users can view analytics for their saved searches"
  ON search_analytics FOR SELECT
  USING (auth.uid()::text = user_id);

-- RLS POLICIES FOR POPULAR_SEARCHES
DROP POLICY IF EXISTS "Anyone can view popular searches" ON popular_searches;
CREATE POLICY "Anyone can view popular searches"
  ON popular_searches FOR SELECT
  USING (true);

-- TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_saved_search_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_search_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when alerts are sent or results change
  INSERT INTO search_analytics (saved_search_id, user_id, last_updated)
  SELECT
    ss.id,
    ss.user_id,
    now()
  FROM saved_searches ss
  WHERE ss.id = COALESCE(NEW.saved_search_id, OLD.saved_search_id)
  ON CONFLICT (saved_search_id) DO UPDATE SET
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_popular_searches()
RETURNS TRIGGER AS $$
BEGIN
  -- Track popular search terms when searches are saved
  IF NEW.search_criteria->>'query' IS NOT NULL THEN
    INSERT INTO popular_searches (search_term, location, search_criteria, search_count, unique_users_count, last_updated)
    VALUES (
      NEW.search_criteria->>'query',
      NEW.search_criteria->>'location',
      NEW.search_criteria,
      1,
      1,
      now()
    )
    ON CONFLICT (search_term, location) DO UPDATE SET
      search_count = popular_searches.search_count + 1,
      unique_users_count = popular_searches.unique_users_count + CASE WHEN popular_searches.last_updated < now() - interval '24 hours' THEN 1 ELSE 0 END,
      last_updated = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS
DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_saved_search_updated_at();

DROP TRIGGER IF EXISTS trigger_update_search_analytics ON search_alerts;
CREATE TRIGGER trigger_update_search_analytics
  AFTER INSERT OR UPDATE OR DELETE ON search_alerts
  FOR EACH ROW EXECUTE FUNCTION update_search_analytics();

DROP TRIGGER IF EXISTS trigger_track_popular_searches ON saved_searches;
CREATE TRIGGER trigger_track_popular_searches
  AFTER INSERT ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION track_popular_searches();

-- FUNCTIONS FOR SEARCH ALERTS
CREATE OR REPLACE FUNCTION send_search_alerts()
RETURNS void AS $$
DECLARE
  search_record record;
  new_apartments uuid[];
  alert_content text;
  alert_subject text;
BEGIN
  -- Loop through active saved searches that need alerts
  FOR search_record IN
    SELECT * FROM saved_searches
    WHERE is_active = true
    AND email_alerts_enabled = true
    AND (
      last_alert_sent_at IS NULL
      OR (
        alert_frequency = 'daily' AND last_alert_sent_at < now() - interval '1 day'
      )
      OR (
        alert_frequency = 'weekly' AND last_alert_sent_at < now() - interval '7 days'
      )
      OR (
        alert_frequency = 'monthly' AND last_alert_sent_at < now() - interval '30 days'
      )
    )
  LOOP
    -- Find new apartments matching this search since last alert
    SELECT array_agg(apartment_id)
    INTO new_apartments
    FROM search_results
    WHERE saved_search_id = search_record.id
    AND first_found_at > COALESCE(search_record.last_alert_sent_at, '1900-01-01'::timestamptz);

    -- Only send alert if there are new apartments
    IF array_length(new_apartments, 1) > 0 THEN
      -- Generate alert content (simplified - would be more sophisticated in production)
      alert_subject := format('New apartments matching "%s"', search_record.name);
      alert_content := format('We found %s new apartments matching your saved search "%s". Check them out now!',
                             array_length(new_apartments, 1), search_record.name);

      -- Insert alert record
      INSERT INTO search_alerts (
        saved_search_id,
        user_id,
        subject,
        content,
        new_apartments_count,
        apartment_ids
      ) VALUES (
        search_record.id,
        search_record.user_id,
        alert_subject,
        alert_content,
        array_length(new_apartments, 1),
        new_apartments
      );

      -- Update last alert sent timestamp
      UPDATE saved_searches
      SET last_alert_sent_at = now(),
          total_results_found = total_results_found + array_length(new_apartments, 1)
      WHERE id = search_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION TO RUN SAVED SEARCHES AND UPDATE RESULTS
CREATE OR REPLACE FUNCTION run_saved_search(target_search_id uuid)
RETURNS integer AS $$
DECLARE
  search_record record;
  matching_apartments uuid[];
  new_results_count integer := 0;
BEGIN
  -- Get search criteria
  SELECT * INTO search_record FROM saved_searches WHERE id = target_search_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- This is a simplified search implementation
  -- In production, this would use the full search logic with PostGIS, etc.
  SELECT array_agg(id)
  INTO matching_apartments
  FROM apartments
  WHERE status = 'available'
  AND (search_record.min_price IS NULL OR price >= search_record.min_price)
  AND (search_record.max_price IS NULL OR price <= search_record.max_price)
  AND (search_record.bedrooms IS NULL OR bedrooms = search_record.bedrooms)
  AND (search_record.bathrooms IS NULL OR bathrooms >= search_record.bathrooms);

  -- Insert new results
  INSERT INTO search_results (saved_search_id, apartment_id, relevance_score)
  SELECT
    target_search_id,
    unnest(matching_apartments),
    0.8 -- Simplified relevance score
  ON CONFLICT (saved_search_id, apartment_id) DO NOTHING;

  GET DIAGNOSTICS new_results_count = ROW_COUNT;

  -- Update search metadata
  UPDATE saved_searches
  SET last_search_run_at = now(),
      new_results_since_last_view = new_results_since_last_view + new_results_count
  WHERE id = target_search_id;

  RETURN new_results_count;
END;
$$ LANGUAGE plpgsql;