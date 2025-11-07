-- =====================================================
-- ALL-IN-ONE MIGRATION SCRIPT
-- Run this ONE script instead of running migrations separately
-- This handles all dependencies in the correct order
-- =====================================================

-- =====================================================
-- STEP 1: Create core user tables
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
-- STEP 2: Add missing apartment columns (if apartments table exists)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apartments' AND table_schema = 'public') THEN
    ALTER TABLE public.apartments
      ADD COLUMN IF NOT EXISTS lease_min_months smallint CHECK (lease_min_months > 0),
      ADD COLUMN IF NOT EXISTS lease_max_months smallint CHECK (lease_max_months >= lease_min_months),
      ADD COLUMN IF NOT EXISTS deposit_months numeric(3,1) DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS utilities_included boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS pets_allowed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS smoking_allowed boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS available_from date,
      ADD COLUMN IF NOT EXISTS owner_verified boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS distance_to_metro_m integer,
      ADD COLUMN IF NOT EXISTS distance_to_university_m integer,
      ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- =====================================================
-- STEP 3: Create conversations and messages tables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  unread_count_student integer DEFAULT 0,
  unread_count_owner integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(apartment_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'viewing_request', 'viewing_confirmed')),
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT messages_content_not_empty CHECK (length(trim(content)) > 0)
);

CREATE TABLE IF NOT EXISTS public.viewing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_datetime timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'completed', 'cancelled')),
  message text,
  confirmed_datetime timestamptz,
  declined_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- STEP 4: Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_stripe ON public.profiles_owner(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner_verification ON public.profiles_owner(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_student_university ON public.profiles_student(university);
CREATE INDEX IF NOT EXISTS idx_profiles_student_budget ON public.profiles_student(budget_max_huf);

CREATE INDEX IF NOT EXISTS idx_conversations_student ON public.conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON public.conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_apartment ON public.conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_student ON public.viewing_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_owner ON public.viewing_requests(owner_id);

-- Add apartment indexes if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apartments' AND table_schema = 'public') THEN
    CREATE INDEX IF NOT EXISTS idx_apartments_lease_min ON public.apartments(lease_min_months);
    CREATE INDEX IF NOT EXISTS idx_apartments_pets ON public.apartments(pets_allowed) WHERE pets_allowed = true;
    CREATE INDEX IF NOT EXISTS idx_apartments_available_from ON public.apartments(available_from);
    CREATE INDEX IF NOT EXISTS idx_apartments_distance_metro ON public.apartments(distance_to_metro_m);
  END IF;
END $$;

-- =====================================================
-- STEP 5: Create triggers
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

-- Conversation update trigger
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean;
BEGIN
  SELECT (sender_id = c.owner_id) INTO is_owner
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = substring(NEW.content, 1, 100),
    unread_count_student = CASE WHEN is_owner THEN unread_count_student + 1 ELSE unread_count_student END,
    unread_count_owner = CASE WHEN is_owner THEN unread_count_owner ELSE unread_count_owner + 1 END,
    updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON public.messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =====================================================
-- STEP 6: Enable RLS on all tables
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 7: Create RLS policies
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
CREATE POLICY "Users can view own record" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Owner profiles policies
DROP POLICY IF EXISTS "Owners can view own profile" ON public.profiles_owner;
CREATE POLICY "Owners can view own profile" ON public.profiles_owner FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can update own profile" ON public.profiles_owner;
CREATE POLICY "Owners can update own profile" ON public.profiles_owner FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owners can insert own profile" ON public.profiles_owner;
CREATE POLICY "Owners can insert own profile" ON public.profiles_owner FOR INSERT WITH CHECK (auth.uid() = id);

-- Student profiles policies
DROP POLICY IF EXISTS "Students can view own profile" ON public.profiles_student;
CREATE POLICY "Students can view own profile" ON public.profiles_student FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles_student;
CREATE POLICY "Students can update own profile" ON public.profiles_student FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Students can insert own profile" ON public.profiles_student;
CREATE POLICY "Students can insert own profile" ON public.profiles_student FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT
  USING (auth.uid() = student_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Students can create conversations" ON public.conversations;
CREATE POLICY "Students can create conversations" ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE
  USING (auth.uid() = student_id OR auth.uid() = owner_id);

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.messages;
CREATE POLICY "Users can send messages in own conversations" ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.messages;
CREATE POLICY "Users can update messages in own conversations" ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'All tables, indexes, triggers, and RLS policies created successfully!' as status;
