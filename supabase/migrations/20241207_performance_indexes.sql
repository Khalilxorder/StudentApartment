-- Database Performance Indexes for Student Apartments
-- Run this migration in Supabase SQL Editor

-- =============================================
-- CORE APARTMENTS INDEXES (always run these)
-- =============================================

-- Index for apartment searches by district
CREATE INDEX IF NOT EXISTS idx_apartments_district ON apartments(district);

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments(price_huf);

-- Index for owner lookups
CREATE INDEX IF NOT EXISTS idx_apartments_owner_id ON apartments(owner_id);

-- Index for availability filtering
CREATE INDEX IF NOT EXISTS idx_apartments_available ON apartments(is_available);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_apartments_search 
ON apartments(district, price_huf, is_available);

-- Text search index for apartment titles (GIN index)
CREATE INDEX IF NOT EXISTS idx_apartments_title_search 
ON apartments USING GIN (to_tsvector('english', title));

-- Text search index for apartment descriptions (GIN index)
CREATE INDEX IF NOT EXISTS idx_apartments_description_search 
ON apartments USING GIN (to_tsvector('english', description));

-- =============================================
-- OPTIONAL: Run these only if tables exist
-- =============================================

-- Uncomment if you have a favorites table:
-- CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
-- CREATE INDEX IF NOT EXISTS idx_favorites_apartment_id ON favorites(apartment_id);

-- Uncomment if you have a messages table:
-- CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
-- CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Uncomment if you have a reviews table:
-- CREATE INDEX IF NOT EXISTS idx_reviews_apartment_id ON reviews(apartment_id);
-- CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
