-- =============================================
-- Feature Flags Infrastructure
-- =============================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  tenant_whitelist UUID[] DEFAULT '{}',
  user_whitelist TEXT[] DEFAULT '{}', -- Can be UUIDs or emails
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;

-- =============================================
-- Webhook System for Integrations
-- =============================================

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL, -- List of event types to listen to
  secret TEXT NOT NULL, -- For signature verification
  enabled BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}', -- Custom headers to include
  retry_config JSONB DEFAULT '{"max_attempts": 3, "backoff": "exponential"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'pending',
  response_code INTEGER,
  response_body TEXT,  error_message TEXT,
  attempt INTEGER DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_tenant_id ON webhook_endpoints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status != 'success';

-- RLS Policies
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY webhook_endpoints_tenant ON webhook_endpoints
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_endpoints TO authenticated;
GRANT SELECT ON webhook_deliveries TO authenticated;

-- Insert default feature flags
INSERT INTO feature_flags (name, description, enabled, rollout_percentage)
VALUES 
  ('ai_search_enhancement', 'Enhanced AI search with semantic ranking', false, 0),
  ('multi_tenant_mode', 'Enable multi-tenant organization accounts', false, 0),
  ('advanced_analytics', 'Advanced analytics dashboard', false, 0),
  ('api_v2', 'Enable API v2 endpoints', false, 0)
ON CONFLICT (name) DO NOTHING;
