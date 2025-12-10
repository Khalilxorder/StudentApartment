-- FILE: utils/create-messages-table.sql
-- SQL to create messages table for chat functionality
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  sender_email text NOT NULL,
  message text NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_apartment ON public.messages(apartment_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read messages for apartments they're viewing
CREATE POLICY "Anyone can read messages"
  ON public.messages
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can send messages
CREATE POLICY "Authenticated users can insert messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- End of file
