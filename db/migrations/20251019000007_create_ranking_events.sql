-- Migration: Create ranking events and weight history tables
-- Date: 2025-10-19

CREATE TABLE IF NOT EXISTS public.ranking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  experiment_id text,
  variant_id text,
  ranking_score numeric(5,4) NOT NULL,
  component_scores jsonb NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ranking_events_apartment ON public.ranking_events(apartment_id);
CREATE INDEX IF NOT EXISTS idx_ranking_events_user ON public.ranking_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_events_created_at ON public.ranking_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.ranking_weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weights jsonb NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ranking_weight_history_created_at
  ON public.ranking_weight_history(created_at DESC);
