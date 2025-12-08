-- Migration: Create stripe_connect_accounts table for Stripe Connect integration
-- This table stores Stripe Connect account information for property owners

CREATE TABLE IF NOT EXISTS public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  account_type text NOT NULL DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  details_submitted boolean DEFAULT false,
  onboarding_complete boolean DEFAULT false,
  country text,
  default_currency text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_user ON public.stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_stripe_id ON public.stripe_connect_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_accounts_charges ON public.stripe_connect_accounts(charges_enabled);

-- Enable RLS
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own stripe accounts"
  ON public.stripe_connect_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stripe accounts"
  ON public.stripe_connect_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe accounts"
  ON public.stripe_connect_accounts
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_stripe_connect_accounts_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stripe_connect_accounts_updated_at ON public.stripe_connect_accounts;
CREATE TRIGGER trg_stripe_connect_accounts_updated_at
  BEFORE UPDATE ON public.stripe_connect_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_connect_accounts_updated_at();

COMMENT ON TABLE public.stripe_connect_accounts IS 'Stripe Connect account information for property owners';
