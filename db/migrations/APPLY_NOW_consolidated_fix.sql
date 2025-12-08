-- =====================================================
-- CONSOLIDATED FIX MIGRATION
-- Run this in Supabase SQL Editor to fix all DB issues
-- Date: 2025-12-04
-- This migration is safe to run multiple times
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENSURE PROFILES TABLE EXISTS WITH ALL COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  role text DEFAULT 'student',
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add ALL missing columns if they don't exist (one by one for safety)
DO $$
BEGIN
  -- Add preferences column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences') THEN
    ALTER TABLE public.profiles ADD COLUMN preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  -- Add role column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'student';
  END IF;
  
  -- Add phone column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone text;
  END IF;
  
  -- Add bio column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio text;
  END IF;
  
  -- Add avatar_url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  
  -- Add full_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name text;
  END IF;
  
  -- Add email column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
  
  -- Add created_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') THEN
    ALTER TABLE public.profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- Add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 2. FIX MESSAGES TABLE BASED ON EXISTING SCHEMA
-- =====================================================

-- Check which schema the messages table has and add missing columns accordingly
DO $$
BEGIN
  -- Check if messages table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    
    -- Check if it has apartment_id column (direct messaging schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'apartment_id') THEN
      -- Direct messaging schema - add conversation columns if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_key') THEN
        ALTER TABLE public.messages ADD COLUMN conversation_key text;
      END IF;
      
      -- Backfill conversation_key for existing messages with apartment_id
      UPDATE public.messages 
      SET conversation_key = apartment_id::text || '::' || 
        LEAST(sender_id::text, receiver_id::text) || '::' || 
        GREATEST(sender_id::text, receiver_id::text)
      WHERE conversation_key IS NULL AND apartment_id IS NOT NULL;
      
    END IF;
    
    -- Create index on conversation_key if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_key') THEN
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_key ON public.messages(conversation_key);
    END IF;
    
  END IF;
END $$;

-- =====================================================
-- 3. CREATE CONVERSATIONS TABLE IF NEEDED
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid REFERENCES public.apartments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  last_message_at timestamptz DEFAULT now(),
  last_message_preview text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = student_id OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- =====================================================
-- 4. CREATE USER_PROFILES VIEW FOR COMPATIBILITY
-- =====================================================

-- Drop the view first
DROP VIEW IF EXISTS public.user_profiles_view;

-- Create a dynamic view that only references columns that actually exist
DO $$
DECLARE
  has_phone boolean;
  has_bio boolean;
  has_avatar_url boolean;
  has_full_name boolean;
  has_email boolean;
  has_role boolean;
  has_preferences boolean;
  has_created_at boolean;
  has_updated_at boolean;
  view_sql text;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') INTO has_phone;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') INTO has_bio;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') INTO has_avatar_url;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') INTO has_full_name;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') INTO has_email;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') INTO has_role;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'preferences') INTO has_preferences;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'created_at') INTO has_created_at;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'updated_at') INTO has_updated_at;
  
  -- Build dynamic view SQL based on existing columns
  view_sql := 'CREATE VIEW public.user_profiles_view AS SELECT p.id as user_id, p.id';
  
  IF has_email THEN view_sql := view_sql || ', p.email'; ELSE view_sql := view_sql || ', NULL::text as email'; END IF;
  IF has_full_name THEN 
    view_sql := view_sql || ', p.full_name';
    view_sql := view_sql || ', SPLIT_PART(COALESCE(p.full_name, ''''), '' '', 1) as first_name';
    view_sql := view_sql || ', CASE WHEN POSITION('' '' IN COALESCE(p.full_name, '''')) > 0 THEN SUBSTRING(p.full_name FROM POSITION('' '' IN p.full_name) + 1) ELSE '''' END as last_name';
  ELSE 
    view_sql := view_sql || ', NULL::text as full_name, NULL::text as first_name, NULL::text as last_name';
  END IF;
  IF has_avatar_url THEN view_sql := view_sql || ', p.avatar_url'; ELSE view_sql := view_sql || ', NULL::text as avatar_url'; END IF;
  IF has_phone THEN view_sql := view_sql || ', p.phone'; ELSE view_sql := view_sql || ', NULL::text as phone'; END IF;
  IF has_bio THEN view_sql := view_sql || ', p.bio'; ELSE view_sql := view_sql || ', NULL::text as bio'; END IF;
  IF has_role THEN view_sql := view_sql || ', p.role as user_type'; ELSE view_sql := view_sql || ', ''student''::text as user_type'; END IF;
  IF has_preferences THEN view_sql := view_sql || ', COALESCE((p.preferences->>''onboarding_completed'')::boolean, false) as onboarding_completed'; ELSE view_sql := view_sql || ', false as onboarding_completed'; END IF;
  IF has_created_at THEN view_sql := view_sql || ', p.created_at'; ELSE view_sql := view_sql || ', now() as created_at'; END IF;
  IF has_updated_at THEN view_sql := view_sql || ', p.updated_at'; ELSE view_sql := view_sql || ', now() as updated_at'; END IF;
  
  view_sql := view_sql || ' FROM public.profiles p';
  
  EXECUTE view_sql;
END $$;

-- Grant access
GRANT SELECT ON public.user_profiles_view TO authenticated;

-- =====================================================
-- 5. FIX APARTMENTS TABLE
-- =====================================================

DO $$
BEGIN
  -- Add image_urls if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'image_urls') THEN
    ALTER TABLE public.apartments ADD COLUMN image_urls text[] DEFAULT '{}';
  END IF;
  
  -- Add price_huf if monthly_rent_huf exists but price_huf doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'monthly_rent_huf') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'price_huf') THEN
    ALTER TABLE public.apartments ADD COLUMN price_huf integer;
    UPDATE public.apartments SET price_huf = monthly_rent_huf WHERE price_huf IS NULL;
  END IF;
  
  -- Add is_available if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'is_available') THEN
    ALTER TABLE public.apartments ADD COLUMN is_available boolean DEFAULT true;
  END IF;
END $$;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.profiles TO authenticated;
GRANT SELECT ON public.apartments TO authenticated;
GRANT SELECT ON public.apartments TO anon;

-- Grant on messages if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    EXECUTE 'GRANT ALL ON public.messages TO authenticated';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    EXECUTE 'GRANT ALL ON public.conversations TO authenticated';
  END IF;
END $$;

-- =====================================================
-- 7. ENSURE RLS POLICIES ON MESSAGES
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policy if any
    DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;
    
    -- Check if sender_id and receiver_id columns exist (direct schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id') THEN
      CREATE POLICY "Users can view their messages" ON public.messages
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
        
      DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
      CREATE POLICY "Users can send messages" ON public.messages
        FOR INSERT WITH CHECK (auth.uid() = sender_id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- DONE! Your database should now be compatible
-- =====================================================
SELECT 'Migration completed successfully!' as status;
