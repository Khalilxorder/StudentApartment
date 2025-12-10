-- FILE: utils/create-apartments-table-clean.sql
-- Cleaned migration to create `apartments` table. Copy this SQL (only the SQL part) into Supabase SQL Editor and run.

-- 1) Ensure pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Create table
CREATE TABLE IF NOT EXISTS public.apartments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  last_updated_at timestamptz DEFAULT now(),

  title text NOT NULL,
  description text,

  price_huf integer NOT NULL,
  district integer,
  address text,
  image_urls text[],
  is_available boolean DEFAULT true,

  latitude double precision,
  longitude double precision,

  bedrooms integer,
  bathrooms integer,
  kitchen integer,
  balcony integer,

  furnishing text,
  elevator text,

  size_sqm integer,
  floor_number integer,
  total_floors integer,
  pet_friendly boolean DEFAULT false,
  smoking_allowed boolean DEFAULT false,
  utilities_included text[],
  amenities text[],
  building_age integer,
  distance_to_metro_m integer,
  distance_to_university_m integer,
  neighborhood_tags text[],
  lease_min_months integer,
  parking_available boolean DEFAULT false,
  heating_type varchar(50),
  cooling_type varchar(50),
  internet_included boolean DEFAULT false,
  laundry_in_unit boolean DEFAULT false,
  move_in_cost_huf integer,
  deposit_months numeric(3,1)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_apartments_price ON public.apartments(price_huf);
CREATE INDEX IF NOT EXISTS idx_apartments_bedrooms ON public.apartments(bedrooms);
CREATE INDEX IF NOT EXISTS idx_apartments_district ON public.apartments(district);
CREATE INDEX IF NOT EXISTS idx_apartments_available ON public.apartments(is_available);

-- End of file
