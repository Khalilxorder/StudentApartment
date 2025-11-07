-- ⚠️ CLEANUP SCRIPT - Use this to start fresh if needed
-- This will DELETE all data and tables created by migrations
-- Only run this if you want to start over!

-- Drop tables in reverse order (due to foreign keys)
DROP TABLE IF EXISTS public.viewing_requests CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.profiles_student CASCADE;
DROP TABLE IF EXISTS public.profiles_owner CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_conversation_on_message() CASCADE;
DROP FUNCTION IF EXISTS reset_unread_count_on_read() CASCADE;

-- Now you can re-run all migrations from scratch
SELECT 'All tables dropped. You can now re-run migrations.' as status;
