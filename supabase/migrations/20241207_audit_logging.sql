-- =============================================
-- Audit Logging Infrastructure
-- Comprehensive audit trail for compliance and security
-- =============================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status) WHERE status = 'failure';

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC) WHERE user_id IS NOT NULL;

-- Enable row-level security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own audit logs
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Only system can insert audit logs (via service role)
CREATE POLICY audit_logs_insert_system ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Prevent updates and deletes (immutable audit trail)
CREATE POLICY audit_logs_no_update ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY audit_logs_no_delete ON audit_logs
  FOR DELETE
  USING (false);

-- Function to automatically clean up old audit logs (7 year retention)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup_audit_logs', '0 2 * * 0', 'SELECT cleanup_old_audit_logs();');

-- Function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  action TEXT,
  resource_type TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    audit_logs.action,
    audit_logs.resource_type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'failure') as failure_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM audit_logs
  WHERE timestamp >= p_start_date
    AND timestamp <= p_end_date
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
  GROUP BY audit_logs.action, audit_logs.resource_type
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all data mutations and user actions. Immutable for compliance.';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB object containing old and new values for changed fields';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context like request_id, session_info, etc.';
