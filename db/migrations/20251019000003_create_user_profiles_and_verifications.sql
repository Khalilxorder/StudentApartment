-- Migration: Create user profiles and verification system
-- Date: 2025-10-19
-- Purpose: Extended user profile management and document verification

-- ============================================
-- User Profiles Table for Onboarding and User Management
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  first_name text,
  last_name text,
  phone text,
  bio text,
  avatar_url text,

  -- User type and onboarding
  user_type text CHECK (user_type IN ('student', 'owner')),
  onboarding_completed boolean DEFAULT false,

  -- Student-specific fields
  university text,
  study_program text,
  graduation_year integer,
  budget_min integer,
  budget_max integer,
  move_in_date date,

  -- Owner-specific fields
  property_type text CHECK (property_type IN ('apartment', 'house', 'room', 'studio', 'dormitory')),
  property_count integer DEFAULT 1,
  experience text CHECK (experience IN ('new', 'some', 'experienced', 'professional')),

  -- Preferences
  notifications_enabled boolean DEFAULT true,
  marketing_enabled boolean DEFAULT false,
  data_sharing_enabled boolean DEFAULT false,

  -- Verification status
  email_verified boolean DEFAULT false,
  identity_verified boolean DEFAULT false,
  background_check_completed boolean DEFAULT false,

  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_profiles_user_type_idx ON public.user_profiles(user_type);
CREATE INDEX IF NOT EXISTS user_profiles_university_idx ON public.user_profiles(university);
CREATE INDEX IF NOT EXISTS user_profiles_budget_idx ON public.user_profiles(budget_min, budget_max);
CREATE INDEX IF NOT EXISTS user_profiles_onboarding_completed_idx ON public.user_profiles(onboarding_completed);

-- ============================================
-- User Verifications Table for Document Verification
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('id_card', 'passport', 'drivers_license', 'student_id', 'address_proof', 'property_deed', 'utility_bill', 'bank_statement')),
  document_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own verifications" ON public.user_verifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications" ON public.user_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verifications" ON public.user_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update verifications" ON public.user_verifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND user_type = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_verifications_user_id_idx ON public.user_verifications(user_id);
CREATE INDEX IF NOT EXISTS user_verifications_status_idx ON public.user_verifications(status);
CREATE INDEX IF NOT EXISTS user_verifications_document_type_idx ON public.user_verifications(document_type);

-- ============================================
-- Helper Functions and Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically update updated_at for user_verifications
CREATE TRIGGER update_user_verifications_updated_at
  BEFORE UPDATE ON public.user_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information for onboarding and user management';
COMMENT ON TABLE public.user_verifications IS 'Document verification records for user identity and property verification';
COMMENT ON COLUMN public.user_profiles.user_type IS 'Type of user: student or owner';
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Whether the user has completed the onboarding process';
COMMENT ON COLUMN public.user_verifications.document_type IS 'Type of document being verified';
COMMENT ON COLUMN public.user_verifications.status IS 'Verification status: pending, approved, or rejected';
