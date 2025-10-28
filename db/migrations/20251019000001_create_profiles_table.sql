-- Migration: Create profiles table and user management system
-- Date: 2025-10-19
-- Purpose: User profile management linked to Supabase auth

-- Create profiles table for storing user information
-- This table is linked to auth.users via foreign key

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  phone text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'owner', 'admin')),
  bio text,
  verified boolean DEFAULT false,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Convenience view for owner profiles used by search service
CREATE OR REPLACE VIEW public.owner_profiles AS
SELECT
  p.id,
  COALESCE(p.full_name, p.email) AS display_name,
  p.email,
  p.phone,
  p.preferences,
  p.verified
FROM public.profiles p
WHERE p.role = 'owner';

COMMENT ON VIEW public.owner_profiles IS 'Slimmed owner profile data for joins in search/ranking services';

-- Add comments for documentation
COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';
COMMENT ON COLUMN public.profiles.role IS 'User role: user (regular tenant), owner (apartment owner), or admin';
COMMENT ON COLUMN public.profiles.preferences IS 'JSON object storing user preferences like search history, favorite features, etc.';
COMMENT ON COLUMN public.profiles.verified IS 'Whether the user has been verified (for owners/landlords)';