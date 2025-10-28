-- Create moderation queue table for admin review system
-- This migration adds the moderation_queue table for flagging suspicious content

CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  flagged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  resolved_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation queue
CREATE POLICY "Admins can view all moderation items" ON public.moderation_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update moderation items" ON public.moderation_queue
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "System can insert moderation items" ON public.moderation_queue
  FOR INSERT WITH CHECK (true);

-- Indexes for moderation queue
CREATE INDEX IF NOT EXISTS moderation_queue_apartment_id_idx ON public.moderation_queue(apartment_id);
CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS moderation_queue_severity_idx ON public.moderation_queue(severity);
CREATE INDEX IF NOT EXISTS moderation_queue_created_at_idx ON public.moderation_queue(created_at DESC);

-- Function to automatically flag suspicious apartments
CREATE OR REPLACE FUNCTION flag_suspicious_apartment(
  p_apartment_id uuid,
  p_reason text,
  p_severity text DEFAULT 'medium'
) RETURNS void AS $$
BEGIN
  -- Insert into moderation queue if not already flagged for this reason
  INSERT INTO public.moderation_queue (
    apartment_id,
    reason,
    severity,
    status
  ) VALUES (
    p_apartment_id,
    p_reason,
    p_severity,
    'pending'
  ) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_moderation_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moderation_queue_updated_at
  BEFORE UPDATE ON public.moderation_queue
  FOR EACH ROW EXECUTE FUNCTION update_moderation_queue_updated_at();