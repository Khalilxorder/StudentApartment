-- ============================================
-- QUICK FIX: Run This FIRST Before Main Migration
-- ============================================
-- This fixes the column name inconsistency issue

-- Step 1: Drop the problematic function that references price_huf
DROP FUNCTION IF EXISTS search_apartments_semantic(vector, float, int);

-- Step 2: Check and show current apartments table structure (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'apartments') THEN
    RAISE NOTICE 'Apartments table already exists. Checking columns...';
    
    -- Show what columns exist
    PERFORM column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'apartments' 
    AND column_name IN ('price_huf', 'monthly_rent_huf', 'monthly_rent');
    
    -- If table has price_huf, rename it
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'price_huf') THEN
      RAISE NOTICE 'Renaming price_huf to monthly_rent_huf...';
      ALTER TABLE public.apartments RENAME COLUMN price_huf TO monthly_rent_huf;
    END IF;
    
    -- If table has monthly_rent, rename it
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'apartments' AND column_name = 'monthly_rent') THEN
      RAISE NOTICE 'Renaming monthly_rent to monthly_rent_huf...';
      ALTER TABLE public.apartments RENAME COLUMN monthly_rent TO monthly_rent_huf;
    END IF;
    
  ELSE
    RAISE NOTICE 'Apartments table does not exist yet - will be created by migration';
  END IF;
END
$$;

-- Step 3: Clean up any other problematic objects
DROP VIEW IF EXISTS apartment_ratings CASCADE;
DROP VIEW IF EXISTS unread_messages_count CASCADE;
DROP VIEW IF EXISTS user_profiles CASCADE;
DROP VIEW IF EXISTS owner_profiles CASCADE;
DROP VIEW IF EXISTS conversation_summaries CASCADE;

-- Final confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Pre-migration fix complete. You can now run the full migration.';
END
$$;
