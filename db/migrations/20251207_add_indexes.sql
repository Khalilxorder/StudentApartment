-- Add indexes for frequently queried columns to improve performance

-- Index for district filtering
CREATE INDEX IF NOT EXISTS idx_apartments_district ON apartments(district);

-- Index for price range filtering (and sorting)
CREATE INDEX IF NOT EXISTS idx_apartments_price_huf ON apartments(price_huf);

-- Index for availability checking
CREATE INDEX IF NOT EXISTS idx_apartments_is_available ON apartments(is_available);

-- Composite index for common search pattern: available apartments in a district
CREATE INDEX IF NOT EXISTS idx_apartments_available_district ON apartments(is_available, district);

-- Index for owner's apartments (dashboard)
CREATE INDEX IF NOT EXISTS idx_apartments_owner_id ON apartments(owner_id);

-- Index for messages between users
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON messages(receiver_id, sender_id);

-- Optimize full text search if we were using it (placeholders for now)
-- CREATE INDEX idx_apartments_title_description ON apartments USING GIN (to_tsvector('english', title || ' ' || description));
