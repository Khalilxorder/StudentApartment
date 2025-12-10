-- =============================================
-- Multi-Tenancy Infrastructure
-- Row-Level Security (RLS) approach for tenant isolation
-- =============================================

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  settings JSONB DEFAULT '{}',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trialing')) DEFAULT 'active',
  subscription_id TEXT, -- Stripe subscription ID
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Add tenant reference to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Create indexes for tenant lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_apartments_tenant_id ON apartments(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_tenant_id ON favorites(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;

-- Tenant members (for organization accounts)
CREATE TABLE IF NOT EXISTS tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);

-- RLS Policies for tenant isolation

-- Apartments: Users can only access apartments in their tenant
DROP POLICY IF EXISTS tenant_isolation_apartments ON apartments;
CREATE POLICY tenant_isolation_apartments ON apartments
  FOR ALL
  USING (
    tenant_id IS NULL OR -- Allow access to non-tenant data (backwards compatibility)
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Profiles: Users can only access profiles in their tenant
DROP POLICY IF EXISTS tenant_isolation_profiles ON profiles;
CREATE POLICY tenant_isolation_profiles ON profiles
  FOR ALL
  USING (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Messages: Users can only access messages in their tenant
DROP POLICY IF EXISTS tenant_isolation_messages ON messages;
CREATE POLICY tenant_isolation_messages ON messages
  FOR ALL
  USING (
    tenant_id IS NULL OR
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Tenant members can view their tenant
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_members_select_own ON tenant_members
  FOR SELECT
  USING (user_id = auth.uid() OR tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));

-- Only tenant owners/admins can manage members
CREATE POLICY tenant_members_manage ON tenant_members
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Function to get current tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_uuid UUID;
BEGIN
  -- Get from session variable (set by application)
  tenant_uuid := current_setting('app.current_tenant_id', true)::UUID;
  
  IF tenant_uuid IS NULL THEN
    -- Fallback: get user's primary tenant
    SELECT tenant_id INTO tenant_uuid
    FROM tenant_members
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- API Usage Tracking for Billing
-- =============================================

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  status_code INTEGER,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Partition by month for efficient queries
CREATE INDEX IF NOT EXISTS idx_api_usage_tenant_timestamp 
ON api_usage(tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint 
ON api_usage(endpoint, timestamp DESC);

-- Function to get usage stats for billing
CREATE OR REPLACE FUNCTION get_usage_stats(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 month',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  endpoint TEXT,
  method TEXT,
  request_count BIGINT,
  avg_response_time_ms NUMERIC,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    api_usage.endpoint,
    api_usage.method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time_ms,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count
  FROM api_usage
  WHERE tenant_id = p_tenant_id
    AND timestamp >= p_start_date
    AND timestamp <= p_end_date
  GROUP BY api_usage.endpoint, api_usage.method
  ORDER BY request_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tenant_members TO authenticated;
GRANT INSERT ON api_usage TO service_role;
GRANT SELECT ON api_usage TO authenticated;
