-- Migration: Add missing digest and analytics tables
-- This migration adds tables for digest functionality and search analytics

-- Digest preferences table
CREATE TABLE IF NOT EXISTS public.digest_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'never')) DEFAULT 'weekly',
  categories text[] DEFAULT ARRAY['new_listings', 'saved_searches'],
  preferred_time text DEFAULT '09:00',
  enabled boolean DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Digest sends history table
CREATE TABLE IF NOT EXISTS public.digest_sends (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  apartment_count integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('sent', 'failed')) DEFAULT 'sent',
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Search logs table for analytics
CREATE TABLE IF NOT EXISTS public.search_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  query text,
  filters jsonb,
  result_count integer,
  selected_apartment_id uuid,
  search_duration_ms integer,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digest_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for digest_preferences
CREATE POLICY "Users can view their own digest preferences" ON public.digest_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own digest preferences" ON public.digest_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own digest preferences" ON public.digest_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all digest preferences" ON public.digest_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for digest_sends
CREATE POLICY "Users can view their own digest sends" ON public.digest_sends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert digest sends" ON public.digest_sends
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all digest sends" ON public.digest_sends
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for search_logs
CREATE POLICY "Users can view their own search logs" ON public.search_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert search logs" ON public.search_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all search logs" ON public.search_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS digest_preferences_user_id_idx ON public.digest_preferences(user_id);
CREATE INDEX IF NOT EXISTS digest_preferences_frequency_idx ON public.digest_preferences(frequency);
CREATE INDEX IF NOT EXISTS digest_sends_user_id_idx ON public.digest_sends(user_id);
CREATE INDEX IF NOT EXISTS digest_sends_sent_at_idx ON public.digest_sends(sent_at DESC);
CREATE INDEX IF NOT EXISTS search_logs_user_id_idx ON public.search_logs(user_id);
CREATE INDEX IF NOT EXISTS search_logs_created_at_idx ON public.search_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS search_logs_query_idx ON public.search_logs USING gin(to_tsvector('english', query));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_digest_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_digest_preferences_updated_at
  BEFORE UPDATE ON public.digest_preferences
  FOR EACH ROW EXECUTE FUNCTION update_digest_preferences_updated_at();

-- Comments
COMMENT ON TABLE public.digest_preferences IS 'User preferences for email digest notifications';
COMMENT ON TABLE public.digest_sends IS 'History of digest emails sent to users';
COMMENT ON TABLE public.search_logs IS 'Analytics data for user search behavior';