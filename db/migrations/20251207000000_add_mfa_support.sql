-- Multi-Factor Authentication (MFA) Table
-- Stores TOTP secrets and backup codes for 2FA

CREATE TABLE IF NOT EXISTS public.user_mfa (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    totp_secret TEXT NOT NULL,
    backup_codes JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own MFA settings"
    ON public.user_mfa
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own MFA settings"
    ON public.user_mfa
    FOR ALL
    USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON public.user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_enabled ON public.user_mfa(enabled);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_mfa_updated_at
    BEFORE UPDATE ON public.user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE public.user_mfa IS 'Stores MFA configuration for users including TOTP secrets and backup codes';
COMMENT ON COLUMN public.user_mfa.totp_secret IS 'Base32-encoded TOTP secret for authenticator apps';
COMMENT ON COLUMN public.user_mfa.backup_codes IS 'JSON array of hashed backup codes: [{ code_hash: string, used: boolean }]';
COMMENT ON COLUMN public.user_mfa.enabled IS 'Whether MFA is currently enabled for this user';
