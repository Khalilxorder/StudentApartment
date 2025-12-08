-- Feedback Events Table for AI Search Analytics
-- Stores telemetry data for search behavior and conversion tracking

CREATE TABLE IF NOT EXISTS public.feedback_events (
  id bigserial PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('search', 'click', 'save', 'contact', 'view', 'compare', 'booking')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE SET NULL,
  search_query text,
  search_filters jsonb,
  result_position integer,
  result_count integer,
  ai_score numeric(5,2),
  ai_reasoning text,
  time_spent_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_feedback_events_type ON public.feedback_events(event_type);
CREATE INDEX IF NOT EXISTS idx_feedback_events_session ON public.feedback_events(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_user ON public.feedback_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_events_apartment ON public.feedback_events(apartment_id) WHERE apartment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_events_created ON public.feedback_events(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_feedback_events_type_created ON public.feedback_events(event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.feedback_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert feedback (including anonymous users)
CREATE POLICY feedback_events_insert ON public.feedback_events
  FOR INSERT WITH CHECK (true);

-- Policy: Only admins can read feedback
CREATE POLICY feedback_events_select ON public.feedback_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comment on table
COMMENT ON TABLE public.feedback_events IS 'Stores telemetry events for AI search analytics and conversion tracking';
