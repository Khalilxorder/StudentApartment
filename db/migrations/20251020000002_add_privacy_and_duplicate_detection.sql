-- Migration: Add duplicate detection and privacy fields, ensure PostGIS geometry exists
-- Date: 2025-10-20

BEGIN;

-- Add canonical_address and duplicate_group_id to apartments for deduplication
ALTER TABLE IF EXISTS public.apartments
  ADD COLUMN IF NOT EXISTS canonical_address text,
  ADD COLUMN IF NOT EXISTS duplicate_group_id uuid;

-- Add privacy flags to protect owner contact on public listings
ALTER TABLE IF EXISTS public.apartments
  ADD COLUMN IF NOT EXISTS hide_owner_contact boolean DEFAULT true;

-- Ensure geometry column is present and properly indexed
ALTER TABLE IF EXISTS public.apartments
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

CREATE INDEX IF NOT EXISTS idx_apartments_geom ON public.apartments USING GIST (geom);

-- Create duplicate detection table
CREATE TABLE IF NOT EXISTS public.apartment_duplicates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  duplicate_apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  score numeric(4,3) NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now()
);

-- Create function to compute similarity score between apartments (address + title + geo distance)
CREATE OR REPLACE FUNCTION public.compute_apartment_similarity(a1 uuid, a2 uuid)
RETURNS numeric(4,3) AS $$
DECLARE
  apt1 RECORD;
  apt2 RECORD;
  addr_score numeric := 0;
  title_score numeric := 0;
  geo_score numeric := 0;
  total numeric := 0;
BEGIN
  SELECT * INTO apt1 FROM public.apartments WHERE id = a1;
  SELECT * INTO apt2 FROM public.apartments WHERE id = a2;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Simple address similarity using trigram
  IF apt1.canonical_address IS NOT NULL AND apt2.canonical_address IS NOT NULL THEN
    addr_score := GREATEST(0, LEAST(1, similarity(apt1.canonical_address, apt2.canonical_address)));
  END IF;

  -- Title similarity
  IF apt1.title IS NOT NULL AND apt2.title IS NOT NULL THEN
    title_score := GREATEST(0, LEAST(1, similarity(apt1.title, apt2.title)));
  END IF;

  -- Geo proximity: within 200 meters is high similarity
  IF apt1.geom IS NOT NULL AND apt2.geom IS NOT NULL THEN
    geo_score := GREATEST(0, LEAST(1, 1 - (ST_DistanceSphere(apt1.geom, apt2.geom) / 2000)));
  END IF;

  total := (addr_score * 0.5) + (title_score * 0.3) + (geo_score * 0.2);
  RETURN ROUND(total::numeric, 3);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;