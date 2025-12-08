-- Migration: Fix and Unify Apartment Favorites Policies
-- Safely re-applies policies to avoid "already exists" errors.
-- Run this script in the Supabase SQL Editor.

-- 1. Drop potentially conflicting policies (original and new names)
DROP POLICY IF EXISTS "favorites_select" ON public.apartment_favorites;
DROP POLICY IF EXISTS "favorites_modify" ON public.apartment_favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.apartment_favorites;
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.apartment_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.apartment_favorites;

-- 2. Enable RLS (idempotent)
ALTER TABLE public.apartment_favorites ENABLE ROW LEVEL SECURITY;

-- 3. Re-create the Policies

-- SELECT: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.apartment_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- INSERT: Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.apartment_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can remove their own favorites
CREATE POLICY "Users can delete their own favorites"
ON public.apartment_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- UPDATE: Users can update their own favorites (Needed for upsert)
CREATE POLICY "Users can update their own favorites"
ON public.apartment_favorites
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Grant permissions
GRANT SELECT, INSERT, DELETE, UPDATE ON public.apartment_favorites TO authenticated;
