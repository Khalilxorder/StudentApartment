/**
 * Phase 5: Media Pipeline - Database Schema
 * Run these migrations to set up media infrastructure
 */

export const MEDIA_PIPELINE_MIGRATIONS = `
-- Media uploads and processing
CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  upload_type TEXT NOT NULL DEFAULT 'apartment',
  original_filename TEXT,
  original_url TEXT NOT NULL,
  optimized_urls JSONB,
  blurhash TEXT,
  metadata JSONB,
  processing_status TEXT DEFAULT 'completed',
  cdn_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT valid_upload_type CHECK (upload_type IN ('apartment', 'avatar', 'document'))
);

CREATE TABLE IF NOT EXISTS media_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media_uploads(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INT DEFAULT 0,
  result JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

CREATE TABLE IF NOT EXISTS media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID REFERENCES media_uploads(id),
  apartment_id UUID REFERENCES apartments(id),
  views INT DEFAULT 0,
  downloads INT DEFAULT 0,
  clicked_from_search BOOLEAN DEFAULT FALSE,
  last_viewed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_uploads_apartment ON media_uploads(apartment_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user ON media_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_media_uploads_created ON media_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_jobs_status ON media_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_media_jobs_media ON media_processing_jobs(media_id);
`;

export const COMMUTE_INTELLIGENCE_MIGRATIONS = `
-- Commute Intelligence: Universities and transit data
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address TEXT,
  website_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transit_stops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  stop_code TEXT,
  parent_station_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commute_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id),
  university_id UUID REFERENCES universities(id),
  from_lat DECIMAL(10, 8),
  from_lng DECIMAL(11, 8),
  to_lat DECIMAL(10, 8),
  to_lng DECIMAL(11, 8),
  mode TEXT NOT NULL,
  duration_minutes INT,
  distance_meters INT,
  route_details JSONB,
  reliability_score INT,
  calculated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (apartment_id, university_id, mode)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_universities_location ON universities USING GIST (
  ST_Point(longitude, latitude)
);
CREATE INDEX IF NOT EXISTS idx_commute_cache_apartment ON commute_cache(apartment_id);
CREATE INDEX IF NOT EXISTS idx_commute_cache_expires ON commute_cache(expires_at);
`;

export const PAYMENTS_MIGRATIONS = `
-- Payment Processing and Stripe Connect
CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  stripe_intent_id TEXT UNIQUE NOT NULL,
  amount_huf INT NOT NULL,
  currency TEXT DEFAULT 'HUF',
  status TEXT NOT NULL DEFAULT 'requires_payment_method',
  client_secret TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN (
    'requires_payment_method', 'requires_confirmation', 'processing',
    'requires_action', 'succeeded', 'canceled'
  ))
);

CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID UNIQUE REFERENCES user_profiles(id),
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'incomplete',
  onboarding_link TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES user_profiles(id),
  stripe_payout_id TEXT UNIQUE NOT NULL,
  amount_huf INT,
  currency TEXT DEFAULT 'HUF',
  status TEXT DEFAULT 'pending',
  arrival_date DATE,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled'))
);

CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID REFERENCES payment_intents(id),
  stripe_refund_id TEXT UNIQUE NOT NULL,
  amount_huf INT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_booking ON payment_intents(booking_id);
CREATE INDEX IF NOT EXISTS idx_payouts_owner ON payouts(owner_id);
CREATE INDEX IF NOT EXISTS idx_refunds_intent ON refunds(payment_intent_id);
`;

export const VIEWING_SCHEDULER_MIGRATIONS = `
-- Viewing Scheduler
CREATE TABLE IF NOT EXISTS viewing_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  capacity INT DEFAULT 1,
  booked_count INT DEFAULT 0,
  status TEXT DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN ('available', 'full', 'cancelled')),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_booked_count CHECK (booked_count >= 0 AND booked_count <= capacity)
);

CREATE TABLE IF NOT EXISTS viewing_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES viewing_slots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES user_profiles(id),
  apartment_id UUID NOT NULL REFERENCES apartments(id),
  owner_id UUID NOT NULL REFERENCES user_profiles(id),
  status TEXT DEFAULT 'pending',
  student_notes TEXT,
  confirmation_token TEXT,
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_status CHECK (status IN (
    'pending', 'confirmed', 'completed', 'no_show', 'cancelled'
  ))
);

CREATE TABLE IF NOT EXISTS viewing_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES viewing_bookings(id) ON DELETE CASCADE,
  student_id UUID REFERENCES user_profiles(id),
  owner_id UUID REFERENCES user_profiles(id),
  student_rating INT,
  owner_rating INT,
  student_comment TEXT,
  owner_comment TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_rating CHECK (student_rating >= 1 AND student_rating <= 5),
  CONSTRAINT valid_owner_rating CHECK (owner_rating >= 1 AND owner_rating <= 5)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_viewing_slots_apartment ON viewing_slots(apartment_id);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_owner ON viewing_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_viewing_slots_time ON viewing_slots(start_time, status);
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_slot ON viewing_bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_student ON viewing_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_viewing_bookings_apartment ON viewing_bookings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_viewing_feedback_booking ON viewing_feedback(booking_id);
`;

export const MODERATION_MIGRATIONS = `
-- Moderation and Content Management
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES user_profiles(id),
  reported_user_id UUID REFERENCES user_profiles(id),
  reported_item_id UUID,
  reported_item_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority INT DEFAULT 5,
  moderator_id UUID REFERENCES user_profiles(id),
  resolution_notes TEXT,
  action_taken TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  CONSTRAINT valid_item_type CHECK (reported_item_type IN (
    'apartment', 'review', 'message', 'profile', 'listing'
  )),
  CONSTRAINT valid_status CHECK (status IN (
    'open', 'investigating', 'resolved', 'dismissed', 'escalated'
  ))
);

CREATE TABLE IF NOT EXISTS user_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  restriction_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity INT DEFAULT 1,
  expires_at TIMESTAMP,
  moderator_id UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_restriction_type CHECK (restriction_type IN (
    'warning', 'limited', 'suspension', 'permanent_ban'
  ))
);

CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID REFERENCES user_profiles(id),
  action_type TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_user ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_expires ON user_restrictions(expires_at);
`;

export const DIGEST_MIGRATIONS = `
-- Saved Search Digests and Preferences
CREATE TABLE IF NOT EXISTS digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES user_profiles(id),
  enabled BOOLEAN DEFAULT TRUE,
  frequency TEXT DEFAULT 'daily',
  send_time TIME DEFAULT '08:00:00',
  email_format TEXT DEFAULT 'html',
  include_price_changes BOOLEAN DEFAULT TRUE,
  include_new_listings BOOLEAN DEFAULT TRUE,
  include_analytics BOOLEAN DEFAULT TRUE,
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_frequency CHECK (frequency IN ('immediately', 'daily', 'weekly', 'never'))
);

CREATE TABLE IF NOT EXISTS digest_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  apartment_count INT DEFAULT 0,
  price_change_count INT DEFAULT 0,
  status TEXT DEFAULT 'sent',
  email_opened BOOLEAN DEFAULT FALSE,
  opened_at TIMESTAMP,
  links_clicked INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS digest_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  token TEXT,
  reason TEXT,
  unsubscribed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_digest_preferences_user ON digest_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_sends_user ON digest_sends(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_digest_sends_status ON digest_sends(status);
`;

// Export all migrations
export const ALL_PHASE_5_10_MIGRATIONS = `
${MEDIA_PIPELINE_MIGRATIONS}

${COMMUTE_INTELLIGENCE_MIGRATIONS}

${PAYMENTS_MIGRATIONS}

${VIEWING_SCHEDULER_MIGRATIONS}

${MODERATION_MIGRATIONS}

${DIGEST_MIGRATIONS}
`;
