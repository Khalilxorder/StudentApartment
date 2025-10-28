-- Migration: Create ranking feedback table
-- Date: 2025-10-19
-- Purpose: Store user feedback for ranking algorithm training

-- Create feedback table for ranking algorithm training
CREATE TABLE IF NOT EXISTS public.ranking_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  search_session_id text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('good', 'bad', 'neutral', 'saved', 'contacted')),
  feedback_score integer NOT NULL CHECK (feedback_score >= -1 AND feedback_score <= 1),

  -- Contextual data for algorithm training
  search_query text,
  search_filters jsonb DEFAULT '{}'::jsonb,
  apartment_position integer,
  apartment_score numeric,
  response_time_ms integer,

  -- Algorithm weights (for bandit algorithm)
  constraint_weight numeric DEFAULT 0,
  personal_weight numeric DEFAULT 0,
  accessibility_weight numeric DEFAULT 0,
  trust_weight numeric DEFAULT 0,
  market_weight numeric DEFAULT 0,
  engagement_weight numeric DEFAULT 0,

  -- Metadata
  user_agent text,
  ip_address inet,
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, apartment_id, search_session_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ranking_feedback_user ON public.ranking_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_feedback_apartment ON public.ranking_feedback(apartment_id);
CREATE INDEX IF NOT EXISTS idx_ranking_feedback_session ON public.ranking_feedback(search_session_id);
CREATE INDEX IF NOT EXISTS idx_ranking_feedback_type ON public.ranking_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_ranking_feedback_created ON public.ranking_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.ranking_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see their own feedback
CREATE POLICY "Users can view own feedback" ON public.ranking_feedback
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON public.ranking_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.ranking_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments
COMMENT ON TABLE public.ranking_feedback IS 'User feedback data for training ranking algorithms';
COMMENT ON COLUMN public.ranking_feedback.feedback_score IS 'Feedback score: -1 (bad), 0 (neutral), 1 (good)';
COMMENT ON COLUMN public.ranking_feedback.constraint_weight IS 'Weight for constraint satisfaction in ranking';
COMMENT ON COLUMN public.ranking_feedback.personal_weight IS 'Weight for personal preferences in ranking';
COMMENT ON COLUMN public.ranking_feedback.accessibility_weight IS 'Weight for accessibility factors in ranking';
COMMENT ON COLUMN public.ranking_feedback.trust_weight IS 'Weight for trust/quality factors in ranking';
COMMENT ON COLUMN public.ranking_feedback.market_weight IS 'Weight for market positioning in ranking';
COMMENT ON COLUMN public.ranking_feedback.engagement_weight IS 'Weight for engagement metrics in ranking';