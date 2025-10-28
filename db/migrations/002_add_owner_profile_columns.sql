-- Migration: Add missing columns to profiles_owner table
-- This fixes the "Could not find the 'average_response_time_minutes' column" error

ALTER TABLE profiles_owner
ADD COLUMN IF NOT EXISTS average_response_time_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_response_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS business_license_url TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS bank_account_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected' CHECK (stripe_account_status IN ('not_connected', 'pending', 'active', 'restricted', 'disabled')),
ADD COLUMN IF NOT EXISTS total_listings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_listings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_inquiries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT DEFAULT 'email' CHECK (preferred_contact_method IN ('email', 'phone', 'both')),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Budapest',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_owner_user_id ON profiles_owner(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_verification_status ON profiles_owner(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_stripe_account_status ON profiles_owner(stripe_account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_average_rating ON profiles_owner(average_rating);

-- Fix RLS policies for profiles_owner
ALTER TABLE profiles_owner DISABLE ROW LEVEL SECURITY;

-- Re-enable with proper policies
ALTER TABLE profiles_owner ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile
CREATE POLICY "Users can view own owner profile" ON profiles_owner
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own owner profile" ON profiles_owner
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own owner profile" ON profiles_owner
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all owner profiles" ON profiles_owner
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles_admin
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- Allow admins to update profiles
CREATE POLICY "Admins can update owner profiles" ON profiles_owner
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles_admin
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );