/**
 * Migration: Update apartment_embeddings schema to use 768-dimensional vectors
 * 
 * Changes:
 * 1. Update apartment_embeddings table to use vector(768) for all embedding columns
 * 2. Create combined_embedding column as single source of truth
 * 3. Rebuild indexes with proper dimension constraints
 * 4. Add metadata columns for embedding lifecycle tracking
 * 
 * Model migration: embedding-001 (384d) → text-embedding-004 (768d)
 */

-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 1: Create new apartment_embeddings table with correct schema if it doesn't exist
-- (If it already exists, we'll alter it)
CREATE TABLE IF NOT EXISTS public.apartment_embeddings (
  apartment_id UUID PRIMARY KEY REFERENCES public.apartments(id) ON DELETE CASCADE,
  description_embedding vector(768),
  feature_embedding vector(768),
  combined_embedding vector(768),
  embedding_model text DEFAULT 'text-embedding-004',
  embedding_dimensions int DEFAULT 768,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add missing columns to existing table if needed
ALTER TABLE public.apartment_embeddings ADD COLUMN IF NOT EXISTS description_embedding vector(768);
ALTER TABLE public.apartment_embeddings ADD COLUMN IF NOT EXISTS feature_embedding vector(768);
ALTER TABLE public.apartment_embeddings ADD COLUMN IF NOT EXISTS combined_embedding vector(768);
ALTER TABLE public.apartment_embeddings ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT 'text-embedding-004';
ALTER TABLE public.apartment_embeddings ADD COLUMN IF NOT EXISTS embedding_dimensions int DEFAULT 768;

-- Step 3: Drop old indexes if they reference wrong dimensions
DROP INDEX IF EXISTS public.apartment_embeddings_combined_idx CASCADE;
DROP INDEX IF EXISTS public.apartment_embeddings_description_idx CASCADE;
DROP INDEX IF EXISTS public.apartment_embeddings_feature_idx CASCADE;

-- Step 4: Create new indexes for 768-dimensional vectors
-- Using HNSW for better accuracy (ivfflat is faster but less accurate)
-- HNSW is better for semantic search quality
CREATE INDEX apartment_embeddings_combined_hnsw_idx
  ON public.apartment_embeddings
  USING hnsw (combined_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

CREATE INDEX apartment_embeddings_description_hnsw_idx
  ON public.apartment_embeddings
  USING hnsw (description_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

CREATE INDEX apartment_embeddings_feature_hnsw_idx
  ON public.apartment_embeddings
  USING hnsw (feature_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 200);

-- Step 5: Create indexes on metadata for faster lookups
CREATE INDEX IF NOT EXISTS apartment_embeddings_updated_at_idx
  ON public.apartment_embeddings(updated_at DESC);

CREATE INDEX IF NOT EXISTS apartment_embeddings_model_idx
  ON public.apartment_embeddings(embedding_model);

-- Step 6: Update RLS policies for apartment_embeddings if needed
ALTER TABLE public.apartment_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS: Allow public read access to embeddings
DROP POLICY IF EXISTS "allow_public_read_embeddings" ON public.apartment_embeddings;
CREATE POLICY "allow_public_read_embeddings" ON public.apartment_embeddings
  FOR SELECT USING (true);

-- RLS: Only system/service can update embeddings (via triggers or scripts)
DROP POLICY IF EXISTS "allow_service_manage_embeddings" ON public.apartment_embeddings;
CREATE POLICY "allow_service_manage_embeddings" ON public.apartment_embeddings
  FOR ALL USING (
    -- Allow updates from authenticated service role or matching owner
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.apartments a 
      WHERE a.id = apartment_embeddings.apartment_id 
        AND a.owner_id = auth.uid()
    ))
    OR auth.role() = 'service_role'
  );

-- Step 7: Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_apartment_embeddings_timestamp ON public.apartment_embeddings CASCADE;
CREATE TRIGGER update_apartment_embeddings_timestamp
  BEFORE UPDATE ON public.apartment_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Add comment documenting the schema
COMMENT ON TABLE public.apartment_embeddings IS 'Apartment semantic embeddings using text-embedding-004 (768 dimensions)';
COMMENT ON COLUMN public.apartment_embeddings.combined_embedding IS 'Single-source-of-truth embedding combining description + features (768d)';
COMMENT ON COLUMN public.apartment_embeddings.description_embedding IS 'Semantic embedding of apartment description (768d)';
COMMENT ON COLUMN public.apartment_embeddings.feature_embedding IS 'Semantic embedding of apartment features/amenities (768d)';
COMMENT ON COLUMN public.apartment_embeddings.embedding_model IS 'Model used for embedding generation (e.g., text-embedding-004)';
COMMENT ON COLUMN public.apartment_embeddings.embedding_dimensions IS 'Dimensionality of embeddings (768 for text-embedding-004)';

-- Step 9: Create search_queries audit table for logging
CREATE TABLE IF NOT EXISTS public.search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  query_text text,
  search_method text CHECK (search_method IN ('keyword', 'semantic', 'structured', 'hybrid')),
  filters jsonb,
  result_count int,
  execution_ms int,
  powered_by text, -- 'api', 'cache', 'fallback'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for search_queries
CREATE INDEX IF NOT EXISTS search_queries_user_id_idx ON public.search_queries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS search_queries_method_idx ON public.search_queries(search_method, created_at DESC);
CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON public.search_queries(created_at DESC);

-- RLS for search_queries
ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_searches" ON public.search_queries;
CREATE POLICY "users_view_own_searches" ON public.search_queries
  FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');

COMMENT ON TABLE public.search_queries IS 'Audit log of search queries for analytics and debugging';
