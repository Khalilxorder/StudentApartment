-- Migration: Add missing columns to profiles_owner
-- Date: 2025-10-19
-- Purpose: Fix schema mismatch error

-- Add missing columns to profiles_owner if they don't exist
ALTER TABLE IF EXISTS public.profiles_owner
ADD COLUMN IF NOT EXISTS average_response_time_minutes INTEGER DEFAULT 24;

-- If profiles_owner doesn't exist, create it
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
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles_owner ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Owners can view their own profile" ON public.profiles_owner
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Owners can update their own profile" ON public.profiles_owner
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Owners can insert their profile" ON public.profiles_owner
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role bypass for auth operations
CREATE POLICY IF NOT EXISTS "Service role can manage profiles" ON public.profiles_owner
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS profiles_owner_id_idx ON public.profiles_owner(id);
CREATE INDEX IF NOT EXISTS profiles_owner_verification_status_idx ON public.profiles_owner(verification_status);
CREATE INDEX IF NOT EXISTS profiles_owner_created_at_idx ON public.profiles_owner(created_at DESC);
