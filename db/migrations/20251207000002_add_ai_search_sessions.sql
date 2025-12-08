-- Migration: Create ai_search_sessions table for AI search agent conversation persistence
-- This table stores AI-powered search conversations and goal states

CREATE TABLE IF NOT EXISTS public.ai_search_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  current_goal jsonb DEFAULT '{
    "budget": {"currency": "HUF"},
    "location": {"districts": []},
    "features": {"must_have": [], "nice_to_have": []},
    "occupancy": {"type": "student", "count": 1},
    "status": "exploring"
  }'::jsonb,
  messages jsonb DEFAULT '[]'::jsonb,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_search_sessions_user ON public.ai_search_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_search_sessions_token ON public.ai_search_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_ai_search_sessions_last_active ON public.ai_search_sessions(last_active_at);

-- Enable RLS
ALTER TABLE public.ai_search_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own search sessions"
  ON public.ai_search_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create search sessions"
  ON public.ai_search_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own search sessions"
  ON public.ai_search_sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own search sessions"
  ON public.ai_search_sessions
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Cleanup old sessions (optional cron job target)
-- Sessions older than 30 days can be cleaned up

COMMENT ON TABLE public.ai_search_sessions IS 'AI search agent conversation sessions and goal states';
