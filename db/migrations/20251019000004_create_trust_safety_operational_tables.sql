-- Migration: Create trust & safety and operational tables
-- Date: 2025-10-19
-- Purpose: Complete trust & safety system and operational tables

-- ============================================
-- Trust & Safety Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes text,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamp with time zone,
  reported_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT different_users CHECK (reporter_id != target_user_id)
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user reports
CREATE POLICY "Users can view reports they submitted" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports" ON public.user_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update reports" ON public.user_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Indexes for user reports
CREATE INDEX IF NOT EXISTS user_reports_reporter_id_idx ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS user_reports_target_user_id_idx ON public.user_reports(target_user_id);
CREATE INDEX IF NOT EXISTS user_reports_status_idx ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS user_reports_reported_at_idx ON public.user_reports(reported_at DESC);

CREATE TABLE IF NOT EXISTS public.content_moderation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'document')),
  content text NOT NULL,
  moderation_result jsonb NOT NULL,
  moderated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.content_moderation ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content moderation
CREATE POLICY "Admins can view all moderated content" ON public.content_moderation
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert moderation records" ON public.content_moderation
  FOR INSERT WITH CHECK (true);

-- Indexes for content moderation
CREATE INDEX IF NOT EXISTS content_moderation_user_id_idx ON public.content_moderation(user_id);
CREATE INDEX IF NOT EXISTS content_moderation_content_type_idx ON public.content_moderation(content_type);
CREATE INDEX IF NOT EXISTS content_moderation_moderated_at_idx ON public.content_moderation(moderated_at DESC);

CREATE TABLE IF NOT EXISTS public.suspicious_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('suspicious_behavior', 'fraud_attempt', 'spam', 'harassment', 'fake_account')),
  description text NOT NULL,
  flagged_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  investigated boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.suspicious_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suspicious activity
CREATE POLICY "Admins can view all suspicious activity" ON public.suspicious_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can report suspicious activity" ON public.suspicious_activity
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Indexes for suspicious activity
CREATE INDEX IF NOT EXISTS suspicious_activity_target_user_id_idx ON public.suspicious_activity(target_user_id);
CREATE INDEX IF NOT EXISTS suspicious_activity_activity_type_idx ON public.suspicious_activity(activity_type);
CREATE INDEX IF NOT EXISTS suspicious_activity_flagged_at_idx ON public.suspicious_activity(flagged_at DESC);

CREATE TABLE IF NOT EXISTS public.trust_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 100),
  change_reason text NOT NULL,
  change_amount integer NOT NULL,
  calculated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trust scores
CREATE POLICY "Users can view their own trust scores" ON public.trust_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trust scores" ON public.trust_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert trust score records" ON public.trust_scores
  FOR INSERT WITH CHECK (true);

-- Indexes for trust scores
CREATE INDEX IF NOT EXISTS trust_scores_user_id_idx ON public.trust_scores(user_id);
CREATE INDEX IF NOT EXISTS trust_scores_calculated_at_idx ON public.trust_scores(calculated_at DESC);

-- ============================================
-- Admin Console Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert audit log records" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- ============================================
-- Pricing Optimization Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.pricing_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id uuid REFERENCES apartments(id) ON DELETE CASCADE NOT NULL,
  old_price integer,
  new_price integer NOT NULL,
  change_reason text NOT NULL,
  changed_by text NOT NULL, -- Could be user_id or 'system'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing history
CREATE POLICY "Owners can view their apartment pricing history" ON public.pricing_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.apartments
      WHERE apartments.id = pricing_history.apartment_id
      AND apartments.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all pricing history" ON public.pricing_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert pricing history records" ON public.pricing_history
  FOR INSERT WITH CHECK (true);

-- Indexes for pricing history
CREATE INDEX IF NOT EXISTS pricing_history_apartment_id_idx ON public.pricing_history(apartment_id);
CREATE INDEX IF NOT EXISTS pricing_history_created_at_idx ON public.pricing_history(created_at DESC);

-- Add search queries table for demand analysis
CREATE TABLE IF NOT EXISTS public.search_queries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  query text,
  district integer,
  min_price integer,
  max_price integer,
  bedrooms integer,
  filters jsonb DEFAULT '{}',
  results_count integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search queries
CREATE POLICY "Users can view their own search queries" ON public.search_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all search queries" ON public.search_queries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can insert their own search queries" ON public.search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for search queries
CREATE INDEX IF NOT EXISTS search_queries_user_id_idx ON public.search_queries(user_id);
CREATE INDEX IF NOT EXISTS search_queries_district_idx ON public.search_queries(district);
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON public.search_queries(created_at DESC);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update trust score
CREATE OR REPLACE FUNCTION update_trust_score(
  p_user_id uuid,
  p_score_change integer,
  p_reason text DEFAULT 'Admin action'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_score integer;
  new_score integer;
BEGIN
  -- Get current trust score
  SELECT COALESCE(
    (SELECT score FROM public.trust_scores
     WHERE user_id = p_user_id
     ORDER BY calculated_at DESC
     LIMIT 1),
    50  -- Default starting score
  ) INTO current_score;

  -- Calculate new score (clamp between 0 and 100)
  new_score := GREATEST(0, LEAST(100, current_score + p_score_change));

  -- Insert new trust score record
  INSERT INTO public.trust_scores (
    user_id,
    score,
    change_reason,
    change_amount,
    calculated_at
  ) VALUES (
    p_user_id,
    new_score,
    p_reason,
    p_score_change,
    timezone('utc'::text, now())
  );
END;
$$;

-- ============================================
-- Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for user reports
CREATE TRIGGER update_user_reports_updated_at
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for content moderation
CREATE TRIGGER update_content_moderation_updated_at
  BEFORE UPDATE ON public.content_moderation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for suspicious activity
CREATE TRIGGER update_suspicious_activity_updated_at
  BEFORE UPDATE ON public.suspicious_activity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.user_reports IS 'User reports for moderation and trust & safety';
COMMENT ON TABLE public.content_moderation IS 'Content moderation results from external services';
COMMENT ON TABLE public.suspicious_activity IS 'Flagged suspicious user activities';
COMMENT ON TABLE public.trust_scores IS 'User trust scores for fraud prevention and quality assurance';
COMMENT ON TABLE public.audit_logs IS 'Audit logs for admin actions and system events';
COMMENT ON TABLE public.pricing_history IS 'Historical pricing data for apartments';
COMMENT ON TABLE public.search_queries IS 'User search queries for analytics and demand analysis';
