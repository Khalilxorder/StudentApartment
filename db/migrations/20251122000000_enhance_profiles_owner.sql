-- Migration: Enhance profiles_owner with completeness score and extended fields
-- Date: 2025-11-22
-- Purpose: Add profile completeness tracking and owner-specific fields

-- Add missing columns to profiles_owner
ALTER TABLE IF EXISTS public.profiles_owner
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS years_experience text DEFAULT '0-2',
ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_contact_method text DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'message')),
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{"facebook": "", "instagram": "", "linkedin": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_completeness_score numeric DEFAULT 0 CHECK (profile_completeness_score >= 0 AND profile_completeness_score <= 100),
ADD COLUMN IF NOT EXISTS last_profile_update timestamp with time zone,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create function to calculate profile completeness score
CREATE OR REPLACE FUNCTION public.calculate_profile_completeness(profile_row profiles_owner)
RETURNS numeric AS $$
DECLARE
  score numeric := 0;
  max_score numeric := 100;
BEGIN
  -- Full name: 15 points
  IF profile_row.full_name IS NOT NULL AND LENGTH(TRIM(profile_row.full_name)) > 0 THEN
    score := score + 15;
  END IF;

  -- Phone: 10 points
  IF profile_row.phone IS NOT NULL AND LENGTH(TRIM(profile_row.phone)) > 0 THEN
    score := score + 10;
  END IF;

  -- Bio: 15 points
  IF profile_row.bio IS NOT NULL AND LENGTH(TRIM(profile_row.bio)) > 0 THEN
    score := score + 15;
  END IF;

  -- Company name: 10 points
  IF profile_row.company_name IS NOT NULL AND LENGTH(TRIM(profile_row.company_name)) > 0 THEN
    score := score + 10;
  END IF;

  -- Website: 10 points
  IF profile_row.website IS NOT NULL AND LENGTH(TRIM(profile_row.website)) > 0 THEN
    score := score + 10;
  END IF;

  -- Specializations: 15 points
  IF profile_row.specializations IS NOT NULL AND ARRAY_LENGTH(profile_row.specializations, 1) > 0 THEN
    score := score + 15;
  END IF;

  -- Years experience: 10 points
  IF profile_row.years_experience IS NOT NULL AND LENGTH(TRIM(profile_row.years_experience)) > 0 THEN
    score := score + 10;
  END IF;

  -- License number: 5 points (optional but valuable)
  IF profile_row.license_number IS NOT NULL AND LENGTH(TRIM(profile_row.license_number)) > 0 THEN
    score := score + 5;
  END IF;

  -- Avatar: 5 points (optional profile picture)
  IF profile_row.avatar_url IS NOT NULL AND LENGTH(TRIM(profile_row.avatar_url)) > 0 THEN
    score := score + 5;
  END IF;

  -- At least one social link: 5 points
  IF profile_row.social_links IS NOT NULL THEN
    IF (profile_row.social_links->>'facebook' IS NOT NULL AND LENGTH(TRIM(profile_row.social_links->>'facebook')) > 0) OR
       (profile_row.social_links->>'instagram' IS NOT NULL AND LENGTH(TRIM(profile_row.social_links->>'instagram')) > 0) OR
       (profile_row.social_links->>'linkedin' IS NOT NULL AND LENGTH(TRIM(profile_row.social_links->>'linkedin')) > 0) THEN
      score := score + 5;
    END IF;
  END IF;

  RETURN GREATEST(0, LEAST(score, max_score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.calculate_profile_completeness(profiles_owner) IS 'Calculate owner profile completeness score (0-100) based on filled fields';

-- Create trigger function to update completeness score and timestamp on profile update
CREATE OR REPLACE FUNCTION public.update_profile_completeness_and_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.profile_completeness_score := calculate_profile_completeness(NEW);
  NEW.last_profile_update := timezone('utc'::text, now());
  NEW.updated_at := timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_profiles_owner_update ON public.profiles_owner;
CREATE TRIGGER on_profiles_owner_update
  BEFORE INSERT OR UPDATE ON public.profiles_owner
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_completeness_and_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_owner_completeness_idx ON public.profiles_owner(profile_completeness_score DESC);
CREATE INDEX IF NOT EXISTS profiles_owner_last_update_idx ON public.profiles_owner(last_profile_update DESC);
CREATE INDEX IF NOT EXISTS profiles_owner_specializations_idx ON public.profiles_owner USING GIN(specializations);

-- Add comment to completeness_score column
COMMENT ON COLUMN public.profiles_owner.profile_completeness_score IS 'Profile completeness score (0-100); automatically calculated on each update';
COMMENT ON COLUMN public.profiles_owner.bio IS 'Owner bio/about text for tenant discovery';
COMMENT ON COLUMN public.profiles_owner.years_experience IS 'Years of experience as property owner/manager';
COMMENT ON COLUMN public.profiles_owner.specializations IS 'Array of property specializations (e.g., Student Housing, Luxury Properties)';
COMMENT ON COLUMN public.profiles_owner.social_links IS 'JSON object with social media links (facebook, instagram, linkedin)';
COMMENT ON COLUMN public.profiles_owner.website IS 'Owner/company website URL';
COMMENT ON COLUMN public.profiles_owner.preferred_contact_method IS 'Preferred contact method: email, phone, or message';
COMMENT ON COLUMN public.profiles_owner.last_profile_update IS 'Timestamp of last profile update (excluding auto-updated fields)';
COMMENT ON COLUMN public.profiles_owner.avatar_url IS 'URL to owner avatar image';
