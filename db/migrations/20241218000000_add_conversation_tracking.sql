-- Add conversation tracking to messages table
-- This migration adds conversation_id to enable proper conversation grouping and querying

-- Add conversation_id column
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

-- Create function to generate conversation_id from apartment and participants
-- Sorts user IDs to ensure consistent conversation_id regardless of who messages first
CREATE OR REPLACE FUNCTION generate_conversation_id(
  p_apartment_id uuid,
  p_user1_id uuid,
  p_user2_id uuid
) RETURNS uuid AS $$
DECLARE
  v_sorted_ids text;
  v_conversation_key text;
BEGIN
  -- Sort user IDs to ensure consistency
  IF p_user1_id < p_user2_id THEN
    v_sorted_ids := p_user1_id::text || '_' || p_user2_id::text;
  ELSE
    v_sorted_ids := p_user2_id::text || '_' || p_user1_id::text;
  END IF;
  
  -- Combine apartment_id with sorted user IDs
  v_conversation_key := p_apartment_id::text || '_' || v_sorted_ids;
  
  -- Generate deterministic UUID from the key
  RETURN uuid_generate_v5('6ba7b810-9dad-11d1-80b4-00c04fd430c8'::uuid, v_conversation_key);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill existing messages with conversation_id
UPDATE public.messages
SET conversation_id = generate_conversation_id(
  apartment_id,
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
)
WHERE conversation_id IS NULL;

-- Make conversation_id NOT NULL after backfill
ALTER TABLE public.messages 
  ALTER COLUMN conversation_id SET NOT NULL;

-- Add index for conversation queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
  ON public.messages(conversation_id, created_at DESC);

-- Add composite index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_lookup 
  ON public.messages(apartment_id, sender_id, receiver_id);

-- Create trigger to auto-generate conversation_id on insert
CREATE OR REPLACE FUNCTION set_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.conversation_id IS NULL THEN
    NEW.conversation_id := generate_conversation_id(
      NEW.apartment_id,
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_conversation_id
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_id();

-- Add conversation summary view for easier querying
CREATE OR REPLACE VIEW public.conversation_summaries AS
SELECT 
  m.conversation_id,
  m.apartment_id,
  a.title as apartment_title,
  a.image_urls[1] as apartment_image,
  m.sender_id,
  m.receiver_id,
  MAX(m.created_at) as last_message_time,
  (SELECT content FROM public.messages WHERE conversation_id = m.conversation_id ORDER BY created_at DESC LIMIT 1) as last_message,
  COUNT(CASE WHEN NOT m.read THEN 1 END) as unread_count
FROM public.messages m
JOIN public.apartments a ON a.id = m.apartment_id
GROUP BY m.conversation_id, m.apartment_id, a.title, a.image_urls, m.sender_id, m.receiver_id;

-- Grant permissions
GRANT SELECT ON public.conversation_summaries TO authenticated;
