-- Create messaging system tables
-- Supports conversations between students and owners about apartments

-- =====================================================
-- Conversations table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  unread_count_student integer DEFAULT 0,
  unread_count_owner integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure only one conversation per student-apartment pair
  UNIQUE(apartment_id, student_id)
);

-- =====================================================
-- Messages table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'viewing_request', 'viewing_confirmed')),
  metadata jsonb, -- For storing additional data (viewing time, location, etc.)
  read_at timestamptz,
  is_read boolean GENERATED ALWAYS AS (read_at IS NOT NULL) STORED,
  created_at timestamptz DEFAULT now(),
  
  -- Ensure content is not empty
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0)
);

-- =====================================================
-- Viewing requests table (optional, for scheduling)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_datetime timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  message text,
  confirmed_datetime timestamptz,
  declined_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_apartment ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_viewing_requests_student ON public.viewing_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_owner ON public.viewing_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_status ON public.viewing_requests(status);

-- =====================================================
-- Trigger to update conversation metadata on new message
-- =====================================================
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Check if sender is the owner
  SELECT (sender_id = c.owner_id) INTO is_owner
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  -- Update conversation
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = substring(NEW.content, 1, 100),
    unread_count_student = CASE WHEN is_owner THEN unread_count_student + 1 ELSE unread_count_student END,
    unread_count_owner = CASE WHEN is_owner THEN unread_count_owner ELSE unread_count_owner + 1 END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- Trigger to reset unread count when messages are read
-- =====================================================
CREATE OR REPLACE FUNCTION reset_unread_count_on_read()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Only proceed if message was just marked as read
  IF OLD.read_at IS NULL AND NEW.read_at IS NOT NULL THEN
    -- Check if the reader is the owner
    SELECT (NEW.sender_id != c.owner_id) INTO is_owner
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;

    -- Decrement unread count
    UPDATE public.conversations
    SET 
      unread_count_student = CASE WHEN NOT is_owner THEN GREATEST(unread_count_student - 1, 0) ELSE unread_count_student END,
      unread_count_owner = CASE WHEN is_owner THEN GREATEST(unread_count_owner - 1, 0) ELSE unread_count_owner END
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_unread_count_on_read
  AFTER UPDATE OF read_at ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION reset_unread_count_on_read();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.conversations IS 'Conversations between students and owners about specific apartments';
COMMENT ON COLUMN public.conversations.unread_count_student IS 'Number of unread messages for the student';
COMMENT ON COLUMN public.conversations.unread_count_owner IS 'Number of unread messages for the owner';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON COLUMN public.messages.message_type IS 'Type of message: text, system notification, or viewing request';
COMMENT ON TABLE public.viewing_requests IS 'Scheduled apartment viewing requests';
