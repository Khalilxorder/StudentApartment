-- Fix RLS Policies for User Creation & Profile Management
-- This migration fixes the "row-level security policy" errors blocking signup

-- Enable RLS on auth.users (if not already)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Remove conflicting policies if they exist
DROP POLICY IF EXISTS "Users can only view their own data" ON auth.users;
DROP POLICY IF EXISTS "Users can update their own data" ON auth.users;
DROP POLICY IF EXISTS "Service role bypass" ON auth.users;

-- Create proper RLS policies for auth.users
-- Allow service role to bypass (for signup)
CREATE POLICY "Service role bypass users" 
  ON auth.users 
  FOR ALL 
  USING (auth.jwt()->>'role' = 'service_role');

-- Allow authenticated users to view their own profile
CREATE POLICY "Users can view own profile" 
  ON auth.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile" 
  ON auth.users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Fix policies on public.users table if it exists
DROP TABLE IF EXISTS public.users CASCADE;

-- Ensure profiles_owner table exists with proper structure
CREATE TABLE IF NOT EXISTS public.profiles_owner (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  company_name text,
  tax_id text,
  bank_account text,
  stripe_account_id text,
  verification_status text DEFAULT 'not_verified' CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'rejected')),
  verification_submitted_at timestamp with time zone,
  verification_completed_at timestamp with time zone,
  payout_enabled boolean DEFAULT false,
  total_listings INTEGER DEFAULT 0,
  active_listings INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0.00,
  average_response_time_minutes INTEGER DEFAULT 24,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles_owner
ALTER TABLE public.profiles_owner ENABLE ROW LEVEL SECURITY;

-- Remove old policies if they exist
DROP POLICY IF EXISTS "Owners can view their own profile" ON public.profiles_owner;
DROP POLICY IF EXISTS "Owners can update their own profile" ON public.profiles_owner;
DROP POLICY IF EXISTS "Owners can insert their profile" ON public.profiles_owner;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles_owner;

-- Create new proper RLS policies for profiles_owner
CREATE POLICY "Users can view own profile_owner" 
  ON public.profiles_owner 
  FOR SELECT 
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert own profile_owner" 
  ON public.profiles_owner 
  FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own profile_owner" 
  ON public.profiles_owner 
  FOR UPDATE 
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS profiles_owner_id_idx ON public.profiles_owner(id);
CREATE INDEX IF NOT EXISTS profiles_owner_verification_status_idx ON public.profiles_owner(verification_status);
CREATE INDEX IF NOT EXISTS profiles_owner_created_at_idx ON public.profiles_owner(created_at DESC);

-- Create similar table for students (profiles_student)
CREATE TABLE IF NOT EXISTS public.profiles_student (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  university text,
  study_year INTEGER,
  budget_min INTEGER,
  budget_max INTEGER,
  move_in_date timestamp with time zone,
  lease_duration_months INTEGER,
  roommate_preference text,
  quiet_study_preference boolean DEFAULT false,
  social_party_preference boolean DEFAULT false,
  pet_friendly boolean DEFAULT false,
  smoking_allowed boolean DEFAULT false,
  parking_needed boolean DEFAULT false,
  gym_access_needed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on profiles_student
ALTER TABLE public.profiles_student ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles_student
CREATE POLICY "Users can view own student profile" 
  ON public.profiles_student 
  FOR SELECT 
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can insert own student profile" 
  ON public.profiles_student 
  FOR INSERT 
  WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can update own student profile" 
  ON public.profiles_student 
  FOR UPDATE 
  USING (auth.uid() = id OR auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.uid() = id OR auth.jwt()->>'role' = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_student_id_idx ON public.profiles_student(id);
CREATE INDEX IF NOT EXISTS profiles_student_university_idx ON public.profiles_student(university);
CREATE INDEX IF NOT EXISTS profiles_student_budget_idx ON public.profiles_student(budget_min, budget_max);
CREATE INDEX IF NOT EXISTS profiles_student_created_at_idx ON public.profiles_student(created_at DESC);
