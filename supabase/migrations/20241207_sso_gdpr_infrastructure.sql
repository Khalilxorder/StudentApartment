-- =============================================
-- SSO Integration Infrastructure
-- Supports SAML 2.0, OIDC, and enterprise SSO providers
-- =============================================

-- SSO Configurations table
CREATE TABLE IF NOT EXISTS sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('okta', 'auth0', 'azure-ad', 'google-workspace', 'custom-saml', 'custom-oidc')),
  entity_id TEXT NOT NULL,
  sso_url TEXT NOT NULL,
  certificate TEXT, -- For SAML
  client_id TEXT, -- For OIDC
  client_secret TEXT, -- For OIDC (encrypted)
  metadata_url TEXT,
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

-- Add SSO fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sso_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sso_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sso_metadata JSONB;

-- Unique constraint for SSO mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_sso_id 
ON profiles(sso_id) WHERE sso_id IS NOT NULL;

-- Index for SSO lookups
CREATE INDEX IF NOT EXISTS idx_profiles_sso_provider 
ON profiles(sso_provider) WHERE sso_provider IS NOT NULL;

-- =============================================
-- GDPR Compliance Infrastructure
-- =============================================

-- GDPR Requests table
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'anonymize', 'rectify', 'restrict', 'object')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  file_path TEXT,
  download_expires_at TIMESTAMPTZ,
  metadata JSONB,
  error_message TEXT
);

-- User Consents table
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purposes TEXT[] NOT NULL,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version TEXT DEFAULT '1.0',
  metadata JSONB
);

-- Data Processing Activities (for GDPR Article 30)
CREATE TABLE IF NOT EXISTS data_processing_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
  data_categories TEXT[] NOT NULL,
  recipients TEXT[],
  retention_period TEXT,
  security_measures TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add soft delete support for GDPR
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON gdpr_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON gdpr_requests(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;

-- RLS Policies
ALTER TABLE sso_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own GDPR requests
CREATE POLICY gdpr_requests_select_own ON gdpr_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own GDPR requests
CREATE POLICY gdpr_requests_insert_own ON gdpr_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only admins can see SSO configurations
CREATE POLICY sso_configurations_admin ON sso_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can see their own consents
CREATE POLICY user_consents_select_own ON user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

-- Function to anonymize user data
CREATE OR REPLACE FUNCTION anonymize_user(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET 
    email = 'deleted-' || p_user_id || '@anonymized.local',
    name = 'Deleted User',
    phone = NULL,
    avatar_url = NULL,
    preferences = '{}',
    anonymized_at = NOW()
  WHERE id = p_user_id;
  
  -- Anonymize messages
  UPDATE messages
  SET content = '[Message deleted]'
  WHERE sender_id = p_user_id OR receiver_id = p_user_id;
  
  -- Log the anonymization
  INSERT INTO gdpr_requests (user_id, request_type, status, completed_at)
  VALUES (p_user_id, 'anonymize', 'completed', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON sso_configurations TO authenticated;
GRANT SELECT, INSERT ON gdpr_requests TO authenticated;
GRANT SELECT, INSERT ON user_consents TO authenticated;
