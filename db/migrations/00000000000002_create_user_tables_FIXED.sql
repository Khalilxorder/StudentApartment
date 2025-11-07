-- FIXED: Create core user tables for role-based access
-- This extends Supabase auth.users with application-specific data
-- Safe to run multiple times

-- =====================================================
-- Core users table (extends auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'owner', 'admin')),
  email text NOT NULL,
  email_verified boolean DEFAULT false,
  phone text,
  phone_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Owner profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles_owner (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  business_name text,
  business_registration_number text,
  stripe_account_id text,
  stripe_verified boolean DEFAULT false,
  stripe_onboarding_completed boolean DEFAULT false,
  stripe_payouts_enabled boolean DEFAULT false,
  tax_id text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text DEFAULT 'HU',
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected')),
  verification_documents jsonb,
  rejected_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Student profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles_student (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  university text,
  student_id text,
  date_of_birth date,
  nationality text,
  preferred_move_in_date date,
  budget_min_huf integer,
  budget_max_huf integer,
  preferred_districts text[],
  preferred_bedrooms smallint,
  preferences jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- Add missing columns if they don't exist (safe for re-runs)
-- =====================================================
DO $$ 
BEGIN
  -- Add budget columns to profiles_student if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_student' 
    AND column_name = 'budget_min_huf'
  ) THEN
    ALTER TABLE public.profiles_student ADD COLUMN budget_min_huf integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_student' 
    AND column_name = 'budget_max_huf'
  ) THEN
    ALTER TABLE public.profiles_student ADD COLUMN budget_max_huf integer;
  END IF;
END $$;

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_stripe ON public.profiles_owner(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_verification ON public.profiles_owner(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_student_university ON public.profiles_student(university);

-- Only create budget index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_student' 
    AND column_name = 'budget_max_huf'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_student_budget ON public.profiles_student(budget_max_huf);
  END IF;
END $$;

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_owner_updated_at ON public.profiles_owner;
CREATE TRIGGER update_profiles_owner_updated_at BEFORE UPDATE ON public.profiles_owner
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_student_updated_at ON public.profiles_student;
CREATE TRIGGER update_profiles_student_updated_at BEFORE UPDATE ON public.profiles_student
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for documentation
-- =====================================================
COMMENT ON TABLE public.users IS 'Core user table extending Supabase auth.users with role information';
COMMENT ON COLUMN public.users.role IS 'User role: student, owner, or admin';
COMMENT ON TABLE public.profiles_owner IS 'Extended profile information for property owners';
COMMENT ON COLUMN public.profiles_owner.stripe_account_id IS 'Stripe Connect Express account ID for payouts';
COMMENT ON COLUMN public.profiles_owner.verification_status IS 'KYC verification status for owner identity';
COMMENT ON TABLE public.profiles_student IS 'Extended profile information for students looking for apartments';

-- Add column comments if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles_student' 
    AND column_name = 'preferences'
  ) THEN
    COMMENT ON COLUMN public.profiles_student.preferences IS 'JSON object with additional preferences (pets, smoking, amenities, etc.)';
  END IF;
END $$;
