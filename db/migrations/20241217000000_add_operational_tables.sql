-- Operational tables required for bookings, payments, notifications, audit trails,
-- and transit data that power owner dashboards and trust & safety flows.

-- BOOKINGS ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id uuid NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'completed')),
  move_in_date date NOT NULL,
  move_out_date date,
  lease_months integer CHECK (lease_months > 0),
  total_rent_huf integer NOT NULL CHECK (total_rent_huf >= 0),
  security_deposit_huf integer CHECK (security_deposit_huf >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_apartment ON public.bookings(apartment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner ON public.bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE POLICY "Tenants can create bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = tenant_id AND auth.role() = 'authenticated');

CREATE POLICY "Tenants can update their pending bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = tenant_id AND status = 'pending')
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Owners can update bookings for their apartments"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- PAYMENT TRANSACTIONS ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_huf integer NOT NULL CHECK (amount_huf >= 0),
  currency text NOT NULL DEFAULT 'HUF',
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  provider text,
  provider_session_id text,
  payout_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking ON public.payment_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_owner ON public.payment_transactions(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON public.payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (auth.uid() = tenant_id OR auth.uid() = owner_id);

CREATE POLICY "System services insert payment transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role updates payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- NOTIFICATIONS ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('booking', 'payment', 'system', 'message')),
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update notification read state"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- AUDIT LOGS -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  actor_role text,
  event text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);

COMMENT ON TABLE public.audit_logs IS 'Immutable audit events for compliance and debugging.';

-- Transit Stops ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transit_stops (
  id text PRIMARY KEY,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  routes text[] NOT NULL DEFAULT ARRAY[]::text[],
  zone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transit_stops_coords
  ON public.transit_stops (latitude, longitude);

INSERT INTO public.transit_stops (id, name, latitude, longitude, routes, zone)
VALUES
  ('bkk_deak_ter', 'Deák Ferenc tér', 47.497912, 19.055836, ARRAY['M1', 'M2', 'M3', '47', '49'], 'Budapest'),
  ('bkk_astoria', 'Astoria', 47.495388, 19.060819, ARRAY['M2', '7', '8E'], 'Budapest'),
  ('bkk_kalvin', 'Kálvin tér', 47.489079, 19.061296, ARRAY['M3', 'M4', '47', '49'], 'Budapest'),
  ('bkk_szell_kalman', 'Széll Kálmán tér', 47.507064, 19.023119, ARRAY['M2', '4', '6', '21'], 'Budapest')
ON CONFLICT (id) DO NOTHING;

-- User Profiles View -----------------------------------------------------------
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.phone,
  p.role,
  p.bio,
  p.verified,
  p.preferences,
  p.created_at,
  p.updated_at
FROM public.profiles p;

COMMENT ON VIEW public.user_profiles IS 'Compatibility view exposing profiles in Supabase default format.';

-- Utility function for updated_at ---------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- VERIFICATION SYSTEM -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('student', 'owner', 'apartment')),
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON public.verification(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_apartment ON public.verification(apartment_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON public.verification(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_status ON public.verification(status);

ALTER TABLE public.verification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
  ON public.verification
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create verifications"
  ON public.verification
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update verifications"
  ON public.verification
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
