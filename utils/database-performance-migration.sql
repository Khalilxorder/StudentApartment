-- Performance and security improvements for apartments table
-- Run this after the main schema migration

-- Add database constraints for data integrity
ALTER TABLE apartments
ADD CONSTRAINT check_price_positive CHECK (price_huf > 0),
ADD CONSTRAINT check_size_positive CHECK (size_sqm > 0),
ADD CONSTRAINT check_bedrooms_non_negative CHECK (bedrooms >= 0),
ADD CONSTRAINT check_bathrooms_non_negative CHECK (bathrooms >= 0),
ADD CONSTRAINT check_district_valid CHECK (district BETWEEN 1 AND 23),
ADD CONSTRAINT check_deposit_months_valid CHECK (deposit_months BETWEEN 1 AND 3);

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_created_at ON apartments(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_updated_at ON apartments(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_price_range ON apartments(price_huf) WHERE is_available = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_location ON apartments(district, price_huf) WHERE is_available = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_features ON apartments(bedrooms, bathrooms, size_sqm) WHERE is_available = true;

-- Add partial indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_available_recent ON apartments(created_at DESC) WHERE is_available = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_unavailable ON apartments(updated_at DESC) WHERE is_available = false;

-- Add text search indexes for future search improvements
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_title_search ON apartments USING gin(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_apartments_description_search ON apartments USING gin(to_tsvector('english', description));

-- Add constraints for user profiles
ALTER TABLE user_profiles
ADD CONSTRAINT check_age_valid CHECK (age BETWEEN 18 AND 100),
ADD CONSTRAINT check_role_valid CHECK (role IN ('student', 'owner', 'admin'));

-- Add indexes for user profiles
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at DESC);

-- Add constraints for messages
ALTER TABLE messages
ADD CONSTRAINT check_message_length CHECK (char_length(content) BETWEEN 1 AND 2000);

-- Add indexes for messages
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation ON messages(apartment_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender ON messages(sender_email, created_at DESC);