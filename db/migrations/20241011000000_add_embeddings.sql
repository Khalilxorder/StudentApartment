-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to apartments table
-- Using 768 dimensions for nomic-embed-text model
-- Adjust to 384 for smaller models or 1536 for larger ones
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for fast vector similarity search
-- Using ivfflat for efficient nearest neighbor search
-- You can also use hnsw for better accuracy: USING hnsw (embedding vector_cosine_ops)
CREATE INDEX IF NOT EXISTS apartments_embedding_idx 
  ON apartments 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Create a function for semantic search
CREATE OR REPLACE FUNCTION search_apartments_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  address text,
  district int,
  bedrooms int,
  bathrooms int,
  price_huf int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apartments.id,
    apartments.title,
    apartments.description,
    apartments.address,
    apartments.district,
    apartments.bedrooms,
    apartments.bathrooms,
    apartments.price_huf,
    1 - (apartments.embedding <=> query_embedding) AS similarity
  FROM apartments
  WHERE apartments.embedding IS NOT NULL
    AND apartments.is_available = true
    AND 1 - (apartments.embedding <=> query_embedding) > match_threshold
  ORDER BY apartments.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Comments for documentation
COMMENT ON COLUMN apartments.embedding IS 'Vector embedding for semantic search using pgvector';
COMMENT ON FUNCTION search_apartments_semantic IS 'Semantic search function using cosine similarity';
