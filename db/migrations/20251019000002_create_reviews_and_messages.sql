-- Migration: Create reviews and messages system
-- Date: 2025-10-19
-- Purpose: Complete reviews and messaging functionality

-- ========================================
-- 1. CREATE REVIEWS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rating scores (1-5 scale)
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  location_rating integer CHECK (location_rating >= 1 AND location_rating <= 5),
  amenities_rating integer CHECK (amenities_rating >= 1 AND amenities_rating <= 5),
  landlord_rating integer CHECK (landlord_rating >= 1 AND landlord_rating <= 5),
  value_rating integer CHECK (value_rating >= 1 AND value_rating <= 5),

  -- Review content
  title text NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
  content text NOT NULL CHECK (char_length(content) >= 10 AND char_length(content) <= 2000),
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',

  -- Metadata
  is_verified boolean DEFAULT false,
  is_anonymous boolean DEFAULT false,
  status text DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_apartment ON public.reviews(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

-- ========================================
-- 2. CREATE UPDATED MESSAGES TABLE FOR CHAT
-- ========================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_apartment ON public.messages(apartment_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);

-- Composite index for conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages(apartment_id, sender_id, receiver_id, created_at DESC);

-- ========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ========================================

-- Reviews RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews"
  ON public.reviews
  FOR SELECT
  USING (status = 'approved');

-- Users can create reviews for apartments they've visited
CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages they sent or received
CREATE POLICY "Users can read their messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id AND auth.role() = 'authenticated');

-- Users can update messages they sent (mark as edited)
CREATE POLICY "Users can update own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id);

-- Users can mark messages as read if they're the receiver
CREATE POLICY "Users can mark messages as read"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- ========================================
-- 4. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for reviews
DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to mark message as read
CREATE OR REPLACE FUNCTION mark_message_as_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = true AND OLD.read = false THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_message_read_at ON public.messages;
CREATE TRIGGER set_message_read_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_read();

-- ========================================
-- 5. CREATE VIEWS FOR EASY QUERYING
-- ========================================

-- View for apartment average ratings
CREATE OR REPLACE VIEW apartment_ratings AS
SELECT
  apartment_id,
  COUNT(*) as review_count,
  ROUND(AVG(overall_rating)::numeric, 2) as avg_overall_rating,
  ROUND(AVG(location_rating)::numeric, 2) as avg_location_rating,
  ROUND(AVG(amenities_rating)::numeric, 2) as avg_amenities_rating,
  ROUND(AVG(landlord_rating)::numeric, 2) as avg_landlord_rating,
  ROUND(AVG(value_rating)::numeric, 2) as avg_value_rating
FROM public.reviews
WHERE status = 'approved'
GROUP BY apartment_id;

-- View for unread message counts
CREATE OR REPLACE VIEW unread_messages_count AS
SELECT
  receiver_id as user_id,
  apartment_id,
  COUNT(*) as unread_count
FROM public.messages
WHERE read = false
GROUP BY receiver_id, apartment_id;

-- ========================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.reviews IS 'User reviews and ratings for apartments';
COMMENT ON TABLE public.messages IS 'Chat messages between users and apartment owners';
COMMENT ON COLUMN public.messages.sender_id IS 'UUID of the user sending the message';
COMMENT ON COLUMN public.messages.receiver_id IS 'UUID of the user receiving the message';
COMMENT ON COLUMN public.messages.read IS 'Whether the message has been read by receiver';
