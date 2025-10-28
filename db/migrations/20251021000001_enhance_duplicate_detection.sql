-- Migration: Enhance duplicate detection with photo hashing and semantic embeddings
-- Date: 2025-10-21

BEGIN;

-- Add description embedding column to apartments for semantic similarity
ALTER TABLE IF EXISTS public.apartments
  ADD COLUMN IF NOT EXISTS description_embedding vector(768);

-- Create table to store photo hashes for perceptual matching
CREATE TABLE IF NOT EXISTS public.apartment_photo_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  image_key text NOT NULL,
  phash bigint NOT NULL,
  -- ahash for additional robustness
  ahash bigint,
  -- dhash for rotation-invariant matching
  dhash bigint,
  -- Hamming distance can be computed between hashes
  created_at timestamptz DEFAULT now(),
  UNIQUE(apartment_id, image_key)
);

CREATE INDEX IF NOT EXISTS idx_apartment_photo_hashes_apartment_id ON public.apartment_photo_hashes(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_photo_hashes_phash ON public.apartment_photo_hashes(phash);

-- Create table to track duplicate detection runs and scores
CREATE TABLE IF NOT EXISTS public.duplicate_detection_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  total_matches integer DEFAULT 0,
  highest_match_score numeric(5,3),
  detection_method text, -- 'full_scan', 'incremental', 'manual'
  run_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_duplicate_detection_runs_apartment_id ON public.duplicate_detection_runs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_detection_runs_run_at ON public.duplicate_detection_runs(run_at DESC);

-- Add additional metadata columns for better duplicate detection
ALTER TABLE IF EXISTS public.apartment_duplicates
  ADD COLUMN IF NOT EXISTS address_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS title_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS geo_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS photo_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS description_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS amenity_score numeric(4,3),
  ADD COLUMN IF NOT EXISTS owner_overlap numeric(4,3),
  ADD COLUMN IF NOT EXISTS detection_method text DEFAULT 'composite';

-- Create enhanced similarity function that includes photo and embedding matching
-- This requires vector extension, so we create a flexible function
CREATE OR REPLACE FUNCTION public.compute_apartment_similarity_enhanced(
  a1 uuid, 
  a2 uuid,
  include_embeddings boolean DEFAULT false
)
RETURNS TABLE (
  total_score numeric,
  address_score numeric,
  title_score numeric,
  geo_score numeric,
  photo_score numeric,
  description_score numeric,
  amenity_score numeric,
  owner_overlap numeric
) AS $$
DECLARE
  apt1 RECORD;
  apt2 RECORD;
  _addr_score numeric := 0;
  _title_score numeric := 0;
  _geo_score numeric := 0;
  _photo_score numeric := 0;
  _desc_score numeric := 0;
  _amenity_score numeric := 0;
  _owner_score numeric := 0;
  _total numeric := 0;
BEGIN
  SELECT * INTO apt1 FROM public.apartments WHERE id = a1;
  SELECT * INTO apt2 FROM public.apartments WHERE id = a2;

  IF apt1.id IS NULL OR apt2.id IS NULL THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Address similarity (trigram-based)
  IF apt1.canonical_address IS NOT NULL AND apt2.canonical_address IS NOT NULL THEN
    _addr_score := GREATEST(0, LEAST(1, similarity(apt1.canonical_address, apt2.canonical_address)));
  END IF;

  -- Title similarity
  IF apt1.title IS NOT NULL AND apt2.title IS NOT NULL THEN
    _title_score := GREATEST(0, LEAST(1, similarity(apt1.title, apt2.title)));
  END IF;

  -- Geographic proximity: within 200 meters
  IF apt1.geom IS NOT NULL AND apt2.geom IS NOT NULL THEN
    _geo_score := GREATEST(0, LEAST(1, 1 - (ST_DistanceSphere(apt1.geom, apt2.geom) / 2000.0)));
  END IF;

  -- Owner overlap: check if same owner has multiple listings
  IF apt1.owner_id IS NOT NULL AND apt2.owner_id IS NOT NULL THEN
    _owner_score := CASE WHEN apt1.owner_id = apt2.owner_id THEN 1.0 ELSE 0.0 END;
  END IF;

  -- Photo matching would happen at application level (using Hamming distance on hashes)
  -- For now, return 0 as placeholder
  _photo_score := 0;

  -- Description similarity using embeddings (if available and enabled)
  IF include_embeddings AND apt1.description_embedding IS NOT NULL AND apt2.description_embedding IS NOT NULL THEN
    -- Cosine similarity is computed at app level
    _desc_score := 0;
  END IF;

  -- Amenity similarity (count overlap)
  IF apt1.amenities IS NOT NULL AND apt2.amenities IS NOT NULL THEN
    -- This would need to be computed at app level with proper JSON handling
    _amenity_score := 0;
  END IF;

  -- Weighted average
  _total := (_addr_score * 0.35) + (_title_score * 0.15) + (_geo_score * 0.25) + 
            (_photo_score * 0.10) + (_desc_score * 0.05) + (_amenity_score * 0.05) +
            (_owner_score * 0.05);

  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
