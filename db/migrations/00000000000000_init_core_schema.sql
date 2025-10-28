-- Core schema bootstrap for Student Apartments platform
-- Enables required extensions and creates foundational tables

-- Extensions ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Helper enums -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('draft', 'review', 'published', 'snoozed', 'archived');
  END IF;
END$$;

-- Universities -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
  id text PRIMARY KEY,
  name text NOT NULL,
  campus text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Amenities catalog -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.amenities (
  code text PRIMARY KEY,
  category text NOT NULL,
  label text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Apartments --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  monthly_rent_huf integer NOT NULL CHECK (monthly_rent_huf > 0),
  room_count smallint NOT NULL CHECK (room_count >= 0),
  bedrooms smallint NOT NULL CHECK (bedrooms >= 0),
  bathrooms smallint NOT NULL CHECK (bathrooms >= 0),
  size_sqm numeric(6,2),
  floor smallint,
  total_floors smallint,
  furnished boolean DEFAULT false,
  has_elevator boolean,
  year_built smallint,
  address text,
  district text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  geom geometry(Point, 4326),
  status listing_status NOT NULL DEFAULT 'draft',
  is_available boolean NOT NULL DEFAULT true,
  completeness_score numeric(4,3) DEFAULT 0,
  media_quality_score numeric(4,3) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CHECK (latitude BETWEEN -90 AND 90),
  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_apartments_status ON public.apartments(status);
CREATE INDEX IF NOT EXISTS idx_apartments_district ON public.apartments(district);
CREATE INDEX IF NOT EXISTS idx_apartments_price ON public.apartments(monthly_rent_huf);
CREATE INDEX IF NOT EXISTS idx_apartments_geom ON public.apartments USING GIST (geom);

-- Maintain geometry column from lat/lng
CREATE OR REPLACE FUNCTION public.enforce_apartment_geom()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apartments_geom ON public.apartments;
CREATE TRIGGER trg_apartments_geom
  BEFORE INSERT OR UPDATE ON public.apartments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_apartment_geom();

-- Apartment media --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartment_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  storage_path text NOT NULL,
  blurhash text,
  width integer,
  height integer,
  quality_score numeric(4,3),
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apartment_media_apartment ON public.apartment_media(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_media_primary ON public.apartment_media(apartment_id, is_primary);

-- Apartment amenities junction ------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartment_amenities (
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  amenity_code text NOT NULL REFERENCES public.amenities(code) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apartment_id, amenity_code)
);

-- Vector embeddings ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartment_embeddings (
  apartment_id uuid PRIMARY KEY REFERENCES public.apartments(id) ON DELETE CASCADE,
  description_embedding vector(384),
  feature_embedding vector(384),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Commute cache ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commute_cache (
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  university_id text NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('transit', 'walking', 'bicycling', 'driving')),
  travel_minutes integer NOT NULL CHECK (travel_minutes > 0),
  distance_meters integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (apartment_id, university_id, mode)
);

-- Saved searches ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_searches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_digest_enabled boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_searches_select ON public.saved_searches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY saved_searches_modify ON public.saved_searches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Favorites --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.apartment_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, apartment_id)
);

ALTER TABLE public.apartment_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY favorites_select ON public.apartment_favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY favorites_modify ON public.apartment_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Pricing snapshots ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_snapshots (
  id bigserial PRIMARY KEY,
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  suggested_price integer NOT NULL,
  confidence numeric(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  market_average integer,
  market_percentile numeric(4,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_snapshots_apartment ON public.pricing_snapshots(apartment_id, created_at DESC);
