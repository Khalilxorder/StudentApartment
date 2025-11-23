-- Fix messaging conversations schema
-- Date: 2025-11-22
-- Purpose: Ensure conversations table uses student_id/owner_id structure
--          and add proper RPC function for conversation management

BEGIN;

-- =====================================================
-- 1. Ensure conversations table has correct schema
-- =====================================================

-- Drop and recreate conversations table with proper schema
DROP TABLE IF EXISTS public.conversations CASCADE;

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
-- 2. Update messages table to reference conversations
-- =====================================================

-- Ensure conversation_id is properly set up
ALTER TABLE public.messages 
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- Add back the foreign key constraint
ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- =====================================================
-- 3. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_apartment ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id) WHERE read_at IS NULL;

-- =====================================================
-- 4. Create RPC function to get or create conversation
-- =====================================================

CREATE OR REPLACE FUNCTION get_or_create_conversation_v2(
  p_apartment_id uuid,
  p_student_id uuid,
  p_owner_id uuid
) RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE apartment_id = p_apartment_id
    AND student_id = p_student_id
    AND owner_id = p_owner_id;

  -- If not found, create new conversation
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      apartment_id,
      student_id,
      owner_id,
      status,
      created_at,
      updated_at,
      last_message_at
    ) VALUES (
      p_apartment_id,
      p_student_id,
      p_owner_id,
      'active',
      now(),
      now(),
      now()
    ) RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. Update conversation metadata on new message
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

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- 6. Reset unread count when messages are read
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

DROP TRIGGER IF EXISTS trigger_reset_unread_count_on_read ON public.messages;
CREATE TRIGGER trigger_reset_unread_count_on_read
  AFTER UPDATE OF read_at ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION reset_unread_count_on_read();

-- =====================================================
-- 7. Set up Row Level Security
-- =====================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = student_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = student_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
CREATE POLICY "Users can update their conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = student_id OR auth.uid() = owner_id);

-- =====================================================
-- 8. Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.conversations IS 'Conversations between students and owners about specific apartments';
COMMENT ON COLUMN public.conversations.student_id IS 'Student user ID';
COMMENT ON COLUMN public.conversations.owner_id IS 'Owner user ID';
COMMENT ON COLUMN public.conversations.unread_count_student IS 'Number of unread messages for the student';
COMMENT ON COLUMN public.conversations.unread_count_owner IS 'Number of unread messages for the owner';
COMMENT ON FUNCTION get_or_create_conversation_v2 IS 'Get existing or create new conversation between student and owner';

COMMIT;
