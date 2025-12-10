-- Reviews & Ratings System Database Schema
-- Run this migration to create comprehensive review system tables

-- 1. REVIEWS TABLE - Main review data
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,

  -- Rating scores (1-5 scale)
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  location_rating integer CHECK (location_rating >= 1 AND location_rating <= 5),
  amenities_rating integer CHECK (amenities_rating >= 1 AND amenities_rating <= 5),
  landlord_rating integer CHECK (landlord_rating >= 1 AND landlord_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Review content
  title text NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
  content text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 2000),
  pros text[] DEFAULT '{}', -- Array of positive points
  cons text[] DEFAULT '{}', -- Array of negative points

  -- Metadata
  move_in_date date,
  move_out_date date,
  lease_duration_months integer,
  rent_amount integer,

  -- Verification and status
  is_verified boolean DEFAULT false,
  is_anonymous boolean DEFAULT false,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderation_reason text,

  -- AI analysis
  sentiment_score decimal(3,2), -- -1.0 to 1.0
  quality_score decimal(3,2), -- 0.0 to 1.0 (spam detection)
  language text DEFAULT 'en',

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  moderated_at timestamptz,
  published_at timestamptz
);

-- 2. REVIEW PHOTOS TABLE - Photo/video attachments
CREATE TABLE IF NOT EXISTS review_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id text NOT NULL,

  -- File information
  file_url text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('image', 'video')),
  file_size integer NOT NULL,
  width integer,
  height integer,
  duration integer, -- for videos

  -- Metadata
  caption text,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,

  -- Moderation
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_reason text,

  created_at timestamptz DEFAULT now(),
  moderated_at timestamptz
);

-- 3. REVIEW VOTES TABLE - Helpfulness voting
CREATE TABLE IF NOT EXISTS review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('helpful', 'unhelpful')),

  created_at timestamptz DEFAULT now(),

  UNIQUE(review_id, user_id) -- One vote per user per review
);

-- 4. REVIEW RESPONSES TABLE - Landlord/owner responses
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  responder_id text NOT NULL, -- landlord/owner user_id
  responder_role text NOT NULL CHECK (responder_role IN ('owner', 'landlord', 'manager')),

  content text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 1000),

  -- Moderation
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_reason text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  moderated_at timestamptz
);

-- 5. REVIEW REPORTS TABLE - User reports for moderation
CREATE TABLE IF NOT EXISTS review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reporter_id text NOT NULL,
  report_reason text NOT NULL CHECK (report_reason IN ('spam', 'inappropriate', 'fake', 'offensive', 'irrelevant', 'other')),
  report_details text,

  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  moderator_notes text,

  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- 6. REVIEW ANALYTICS TABLE - Aggregate data for performance
CREATE TABLE IF NOT EXISTS review_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,

  -- Aggregate ratings
  total_reviews integer DEFAULT 0,
  average_rating decimal(3,2) DEFAULT 0,
  average_location_rating decimal(3,2) DEFAULT 0,
  average_amenities_rating decimal(3,2) DEFAULT 0,
  average_landlord_rating decimal(3,2) DEFAULT 0,
  average_value_rating decimal(3,2) DEFAULT 0,

  -- Review distribution
  rating_1_count integer DEFAULT 0,
  rating_2_count integer DEFAULT 0,
  rating_3_count integer DEFAULT 0,
  rating_4_count integer DEFAULT 0,
  rating_5_count integer DEFAULT 0,

  -- Engagement metrics
  total_helpful_votes integer DEFAULT 0,
  total_responses integer DEFAULT 0,
  total_photos integer DEFAULT 0,

  -- Quality metrics
  verified_reviews_percentage decimal(5,2) DEFAULT 0,
  response_rate_percentage decimal(5,2) DEFAULT 0,

  last_updated timestamptz DEFAULT now(),

  UNIQUE(apartment_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_reviews_apartment_id ON reviews(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_rating ON reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_verified ON reviews(is_verified);
CREATE INDEX IF NOT EXISTS idx_reviews_published_at ON reviews(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_photos_review_id ON review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_status ON review_photos(status);

CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_votes_user_id ON review_votes(user_id);

CREATE INDEX IF NOT EXISTS idx_review_responses_review_id ON review_responses(review_id);
CREATE INDEX IF NOT EXISTS idx_review_responses_responder_id ON review_responses(responder_id);

CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON review_reports(status);

CREATE INDEX IF NOT EXISTS idx_review_analytics_apartment_id ON review_analytics(apartment_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_analytics ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR REVIEWS
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON reviews FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;
CREATE POLICY "Users can view their own reviews"
  ON reviews FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Verified users can create reviews" ON reviews;
CREATE POLICY "Verified users can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.user_id = auth.uid()::text
      AND bookings.payment_status = 'paid'
    )
  );

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid()::text = user_id);

-- RLS POLICIES FOR REVIEW PHOTOS
DROP POLICY IF EXISTS "Anyone can view approved review photos" ON review_photos;
CREATE POLICY "Anyone can view approved review photos"
  ON review_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_photos.review_id
      AND reviews.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can upload photos to their reviews" ON review_photos;
CREATE POLICY "Users can upload photos to their reviews"
  ON review_photos FOR INSERT
  WITH CHECK (
    auth.uid()::text = user_id AND
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_photos.review_id
      AND reviews.user_id = auth.uid()::text
    )
  );

-- RLS POLICIES FOR REVIEW VOTES
DROP POLICY IF EXISTS "Anyone can view review votes" ON review_votes;
CREATE POLICY "Anyone can view review votes"
  ON review_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can vote on reviews" ON review_votes;
CREATE POLICY "Authenticated users can vote on reviews"
  ON review_votes FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON review_votes;
CREATE POLICY "Users can update their own votes"
  ON review_votes FOR UPDATE
  USING (auth.uid()::text = user_id);

-- RLS POLICIES FOR REVIEW RESPONSES
DROP POLICY IF EXISTS "Anyone can view approved responses" ON review_responses;
CREATE POLICY "Anyone can view approved responses"
  ON review_responses FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Apartment owners can respond to reviews" ON review_responses;
CREATE POLICY "Apartment owners can respond to reviews"
  ON review_responses FOR INSERT
  WITH CHECK (
    auth.uid()::text = responder_id AND
    EXISTS (
      SELECT 1 FROM reviews r
      JOIN apartments a ON r.apartment_id = a.id
      WHERE r.id = review_responses.review_id
      AND a.owner_id = auth.uid()::text
    )
  );

-- RLS POLICIES FOR REVIEW REPORTS
DROP POLICY IF EXISTS "Users can report reviews" ON review_reports;
CREATE POLICY "Users can report reviews"
  ON review_reports FOR INSERT
  WITH CHECK (auth.uid()::text = reporter_id);

DROP POLICY IF EXISTS "Users can view their own reports" ON review_reports;
CREATE POLICY "Users can view their own reports"
  ON review_reports FOR SELECT
  USING (auth.uid()::text = reporter_id);

-- RLS POLICIES FOR REVIEW ANALYTICS
DROP POLICY IF EXISTS "Anyone can view review analytics" ON review_analytics;
CREATE POLICY "Anyone can view review analytics"
  ON review_analytics FOR SELECT
  USING (true);

-- TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_review_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update analytics when reviews are inserted, updated, or deleted
  INSERT INTO review_analytics (apartment_id, last_updated)
  VALUES (NEW.apartment_id, now())
  ON CONFLICT (apartment_id) DO UPDATE SET
    last_updated = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS
DROP TRIGGER IF EXISTS trigger_update_review_analytics ON reviews;
CREATE TRIGGER trigger_update_review_analytics
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_review_analytics();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_review_responses_updated_at ON review_responses;
CREATE TRIGGER update_review_responses_updated_at
  BEFORE UPDATE ON review_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION TO RECALCULATE REVIEW ANALYTICS
CREATE OR REPLACE FUNCTION recalculate_review_analytics(target_apartment_id uuid)
RETURNS void AS $$
DECLARE
  review_stats record;
BEGIN
  -- Calculate aggregate statistics
  SELECT
    COUNT(*) as total_reviews,
    ROUND(AVG(overall_rating), 2) as avg_rating,
    ROUND(AVG(location_rating), 2) as avg_location,
    ROUND(AVG(amenities_rating), 2) as avg_amenities,
    ROUND(AVG(landlord_rating), 2) as avg_landlord,
    ROUND(AVG(value_rating), 2) as avg_value,
    COUNT(*) FILTER (WHERE overall_rating = 1) as rating_1,
    COUNT(*) FILTER (WHERE overall_rating = 2) as rating_2,
    COUNT(*) FILTER (WHERE overall_rating = 3) as rating_3,
    COUNT(*) FILTER (WHERE overall_rating = 4) as rating_4,
    COUNT(*) FILTER (WHERE overall_rating = 5) as rating_5,
    COUNT(*) FILTER (WHERE is_verified = true) as verified_count,
    COUNT(*) FILTER (WHERE id IN (SELECT review_id FROM review_responses)) as responses_count,
    COUNT(*) FILTER (WHERE id IN (SELECT review_id FROM review_photos)) as photos_count,
    COALESCE(SUM((SELECT COUNT(*) FROM review_votes WHERE review_id = reviews.id AND vote_type = 'helpful')), 0) as helpful_votes
  INTO review_stats
  FROM reviews
  WHERE apartment_id = target_apartment_id AND status = 'approved';

  -- Update or insert analytics record
  INSERT INTO review_analytics (
    apartment_id, total_reviews, average_rating, average_location_rating,
    average_amenities_rating, average_landlord_rating, average_value_rating,
    rating_1_count, rating_2_count, rating_3_count, rating_4_count, rating_5_count,
    total_helpful_votes, total_responses, total_photos,
    verified_reviews_percentage, response_rate_percentage, last_updated
  ) VALUES (
    target_apartment_id,
    review_stats.total_reviews,
    review_stats.avg_rating,
    review_stats.avg_location,
    review_stats.avg_amenities,
    review_stats.avg_landlord,
    review_stats.avg_value,
    review_stats.rating_1,
    review_stats.rating_2,
    review_stats.rating_3,
    review_stats.rating_4,
    review_stats.rating_5,
    review_stats.helpful_votes,
    review_stats.responses_count,
    review_stats.photos_count,
    CASE WHEN review_stats.total_reviews > 0
         THEN ROUND((review_stats.verified_count::decimal / review_stats.total_reviews) * 100, 2)
         ELSE 0 END,
    CASE WHEN review_stats.total_reviews > 0
         THEN ROUND((review_stats.responses_count::decimal / review_stats.total_reviews) * 100, 2)
         ELSE 0 END,
    now()
  )
  ON CONFLICT (apartment_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    average_location_rating = EXCLUDED.average_location_rating,
    average_amenities_rating = EXCLUDED.average_amenities_rating,
    average_landlord_rating = EXCLUDED.average_landlord_rating,
    average_value_rating = EXCLUDED.average_value_rating,
    rating_1_count = EXCLUDED.rating_1_count,
    rating_2_count = EXCLUDED.rating_2_count,
    rating_3_count = EXCLUDED.rating_3_count,
    rating_4_count = EXCLUDED.rating_4_count,
    rating_5_count = EXCLUDED.rating_5_count,
    total_helpful_votes = EXCLUDED.total_helpful_votes,
    total_responses = EXCLUDED.total_responses,
    total_photos = EXCLUDED.total_photos,
    verified_reviews_percentage = EXCLUDED.verified_reviews_percentage,
    response_rate_percentage = EXCLUDED.response_rate_percentage,
    last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

-- NOTIFICATION FUNCTION FOR NEW REVIEWS
CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify apartment owner of new review
  IF NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, type, title, content, link)
    SELECT
      a.owner_id,
      'review',
      'New Review Posted',
      'A new review has been posted for your apartment: ' || a.title,
      '/owner/reviews'
    FROM apartments a
    WHERE a.id = NEW.apartment_id AND a.owner_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_review ON reviews;
CREATE TRIGGER trigger_notify_new_review
  AFTER INSERT OR UPDATE OF status ON reviews
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION notify_new_review();
</content>
<parameter name="filePath">c:\Users\Administrator\Desktop\SA\utils\reviews-system-migration.sql