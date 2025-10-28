-- Fix conversations table schema and add proper UUID-based conversation IDs
-- This migration creates a proper conversations table with UUID primary keys

BEGIN;

-- Drop existing conversations table if it exists
DROP TABLE IF EXISTS public.conversations CASCADE;

-- Create conversations table with proper UUID primary key
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE NOT NULL,
  participant1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_message_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT different_participants CHECK (participant1_id != participant2_id),
  CONSTRAINT ordered_participants CHECK (participant1_id < participant2_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant1_id);

CREATE POLICY "Users can update conversations they participate in" ON public.conversations
  FOR UPDATE USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS conversations_participant1_id_idx ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS conversations_participant2_id_idx ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS conversations_apartment_id_idx ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS conversations_last_message_at_idx ON public.conversations(last_message_at DESC);

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_apartment_id uuid,
  p_participant1_id uuid,
  p_participant2_id uuid
) RETURNS uuid AS $$
DECLARE
  v_conversation_id uuid;
  v_ordered_participant1 uuid;
  v_ordered_participant2 uuid;
BEGIN
  -- Ensure consistent ordering
  IF p_participant1_id < p_participant2_id THEN
    v_ordered_participant1 := p_participant1_id;
    v_ordered_participant2 := p_participant2_id;
  ELSE
    v_ordered_participant1 := p_participant2_id;
    v_ordered_participant2 := p_participant1_id;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE apartment_id = p_apartment_id
    AND participant1_id = v_ordered_participant1
    AND participant2_id = v_ordered_participant2;

  -- If not found, create new conversation
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (
      apartment_id,
      participant1_id,
      participant2_id,
      created_at,
      updated_at,
      last_message_at
    ) VALUES (
      p_apartment_id,
      v_ordered_participant1,
      v_ordered_participant2,
      now(),
      now(),
      now()
    ) RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update messages table to use proper conversation_id references
-- First, update existing messages to use proper conversation IDs
UPDATE public.messages
SET conversation_id = get_or_create_conversation(
  apartment_id,
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id)
)
WHERE conversation_id IS NULL OR conversation_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Make conversation_id reference the conversations table
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey,
  ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Update conversation last_message_at when messages are inserted/updated
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation timestamps
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

COMMIT;