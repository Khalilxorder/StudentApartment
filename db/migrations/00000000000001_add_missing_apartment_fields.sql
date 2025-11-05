-- Add missing commonly needed fields to apartments table
-- These fields were referenced in the old UI but missing from schema

ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS lease_min_months smallint CHECK (lease_min_months > 0),
  ADD COLUMN IF NOT EXISTS lease_max_months smallint CHECK (lease_max_months >= lease_min_months),
  ADD COLUMN IF NOT EXISTS deposit_months numeric(3,1) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS utilities_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS owner_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS distance_to_metro_m integer,
  ADD COLUMN IF NOT EXISTS distance_to_university_m integer,
  ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT ARRAY[]::text[];

-- Add indexes for commonly filtered fields
CREATE INDEX IF NOT EXISTS idx_apartments_lease_min ON public.apartments(lease_min_months);
CREATE INDEX IF NOT EXISTS idx_apartments_pets ON public.apartments(pets_allowed) WHERE pets_allowed = true;
CREATE INDEX IF NOT EXISTS idx_apartments_available_from ON public.apartments(available_from);
CREATE INDEX IF NOT EXISTS idx_apartments_distance_metro ON public.apartments(distance_to_metro_m);

-- Add comments for documentation
COMMENT ON COLUMN public.apartments.lease_min_months IS 'Minimum lease duration in months';
COMMENT ON COLUMN public.apartments.deposit_months IS 'Security deposit in months of rent';
COMMENT ON COLUMN public.apartments.utilities_included IS 'Whether utilities (electricity, water, heating) are included in rent';
COMMENT ON COLUMN public.apartments.pets_allowed IS 'Whether pets are allowed';
COMMENT ON COLUMN public.apartments.owner_verified IS 'Whether the owner has completed verification';
COMMENT ON COLUMN public.apartments.distance_to_metro_m IS 'Walking distance to nearest metro station in meters';
COMMENT ON COLUMN public.apartments.distance_to_university_m IS 'Distance to nearest university in meters';
COMMENT ON COLUMN public.apartments.image_urls IS 'Array of image URLs for the apartment';
