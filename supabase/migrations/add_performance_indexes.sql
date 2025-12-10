-- Database Performance Optimization
-- Adds indexes for foreign keys and common query patterns

-- Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_apartments_owner_id ON apartments(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_apartment_id ON bookings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_reviews_apartment_id ON reviews(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_apartment_id ON favorites(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student_id ON conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON conversations(owner_id);

-- Common Query Patterns
CREATE INDEX IF NOT EXISTS idx_apartments_status_available ON apartments(status, is_available) WHERE status = 'published' AND is_available = true;
CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments(monthly_rent_huf) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_apartments_district ON apartments(district) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_apartments_created_at ON apartments(created_at DESC);

-- Composite Indexes for Common Filters
CREATE INDEX IF NOT EXISTS idx_apartments_district_price ON apartments(district, monthly_rent_huf) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_apartments_bedrooms_price ON apartments(bedrooms, monthly_rent_huf) WHERE is_available = true;

-- Text Search Optimization
CREATE INDEX IF NOT EXISTS idx_apartments_title_trgm ON apartments USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_apartments_description_trgm ON apartments USING gin(description gin_trgm_ops);

-- Geospatial Index
CREATE INDEX IF NOT EXISTS idx_apartments_location ON apartments USING gist(ll_to_earth(latitude, longitude));

-- Performance: Analyze tables after index creation
ANALYZE apartments;
ANALYZE bookings;
ANALYZE messages;
ANALYZE reviews;
ANALYZE favorites;
ANALYZE conversations;
