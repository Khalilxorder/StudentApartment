-- Row Level Security (RLS) policies for all user and message tables
-- Ensures users can only access their own data

-- =====================================================
-- Enable RLS on all tables
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Users table policies
-- =====================================================

-- Users can read their own record
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own record (for profile creation)
CREATE POLICY "Users can insert own record"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- Profiles_owner table policies
-- =====================================================

-- Owners can read their own profile
CREATE POLICY "Owners can view own profile"
  ON public.profiles_owner FOR SELECT
  USING (auth.uid() = id);

-- Owners can update their own profile
CREATE POLICY "Owners can update own profile"
  ON public.profiles_owner FOR UPDATE
  USING (auth.uid() = id);

-- Owners can insert their own profile
CREATE POLICY "Owners can insert own profile"
  ON public.profiles_owner FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Students can view owner profiles (for apartment listings)
CREATE POLICY "Students can view owner profiles"
  ON public.profiles_owner FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('student', 'admin')
    )
  );

-- =====================================================
-- Profiles_student table policies
-- =====================================================

-- Students can read their own profile
CREATE POLICY "Students can view own profile"
  ON public.profiles_student FOR SELECT
  USING (auth.uid() = id);

-- Students can update their own profile
CREATE POLICY "Students can update own profile"
  ON public.profiles_student FOR UPDATE
  USING (auth.uid() = id);

-- Students can insert their own profile
CREATE POLICY "Students can insert own profile"
  ON public.profiles_student FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Owners can view student profiles (for conversations)
CREATE POLICY "Owners can view student profiles"
  ON public.profiles_student FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- Conversations table policies
-- =====================================================

-- Users can view conversations they're part of
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (
    auth.uid() = student_id OR 
    auth.uid() = owner_id
  );

-- Students can create conversations
CREATE POLICY "Students can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'student'
    )
  );

-- Users can update conversations they're part of (for status changes)
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  USING (
    auth.uid() = student_id OR 
    auth.uid() = owner_id
  );

-- =====================================================
-- Messages table policies
-- =====================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in own conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- Users can update their own messages (for marking as read)
CREATE POLICY "Users can update messages in own conversations"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.student_id = auth.uid() OR conversations.owner_id = auth.uid())
    )
  );

-- =====================================================
-- Viewing_requests table policies
-- =====================================================

-- Users can view viewing requests they're part of
CREATE POLICY "Users can view own viewing requests"
  ON public.viewing_requests FOR SELECT
  USING (
    auth.uid() = student_id OR 
    auth.uid() = owner_id
  );

-- Students can create viewing requests
CREATE POLICY "Students can create viewing requests"
  ON public.viewing_requests FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'student'
    )
  );

-- Users can update viewing requests they're part of
CREATE POLICY "Users can update own viewing requests"
  ON public.viewing_requests FOR UPDATE
  USING (
    auth.uid() = student_id OR 
    auth.uid() = owner_id
  );

-- =====================================================
-- Admin override policies (optional, for support)
-- =====================================================

-- Admins can view all records
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all owner profiles"
  ON public.profiles_owner FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all student profiles"
  ON public.profiles_student FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- =====================================================
-- Comments
-- =====================================================
COMMENT ON POLICY "Users can view own record" ON public.users IS 'Users can only see their own user record';
COMMENT ON POLICY "Students can view owner profiles" ON public.profiles_owner IS 'Students need to see owner info when viewing apartments';
COMMENT ON POLICY "Owners can view student profiles" ON public.profiles_student IS 'Owners need to see student info in conversations';
