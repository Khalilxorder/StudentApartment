-- Seed data for testing the Student Apartments platform
-- Creates test users, apartments, and conversations

-- =====================================================
-- IMPORTANT: Replace these UUIDs with actual auth.users IDs
-- after creating test accounts in Supabase Auth
-- =====================================================

-- Test User IDs (you'll need to replace these)
-- Create these accounts in Supabase Auth Dashboard first:
-- 1. student1@test.com (password: Test123!)
-- 2. student2@test.com (password: Test123!)
-- 3. owner1@test.com (password: Test123!)
-- 4. owner2@test.com (password: Test123!)

-- =====================================================
-- Insert users (assumes auth.users records already exist)
-- =====================================================

-- You'll need to run this after creating auth accounts:
-- Get the UUIDs from: SELECT id, email FROM auth.users;

-- Example (replace UUIDs with your actual values):
/*
INSERT INTO public.users (id, role, email, email_verified) VALUES
  ('STUDENT1-UUID-HERE', 'student', 'student1@test.com', true),
  ('STUDENT2-UUID-HERE', 'student', 'student2@test.com', true),
  ('OWNER1-UUID-HERE', 'owner', 'owner1@test.com', true),
  ('OWNER2-UUID-HERE', 'owner', 'owner2@test.com', true);
*/

-- =====================================================
-- Helper function to safely insert test data
-- =====================================================

-- For this seed to work automatically, we'll use a different approach:
-- Create a function that looks up user IDs by email

CREATE OR REPLACE FUNCTION get_user_id_by_email(user_email text)
RETURNS uuid AS $$
DECLARE
  user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Seed student profiles (only if users exist)
-- =====================================================

DO $$
DECLARE
  student1_id uuid;
  student2_id uuid;
BEGIN
  -- Get student IDs
  student1_id := get_user_id_by_email('student1@test.com');
  student2_id := get_user_id_by_email('student2@test.com');

  -- Only insert if users exist
  IF student1_id IS NOT NULL THEN
    -- Insert into users table
    INSERT INTO public.users (id, role, email, email_verified)
    VALUES (student1_id, 'student', 'student1@test.com', true)
    ON CONFLICT (id) DO UPDATE SET role = 'student';

    -- Insert profile
    INSERT INTO public.profiles_student (id, user_id, full_name, university, phone, budget_min_huf, budget_max_huf, preferred_districts, preferred_bedrooms)
    VALUES (
      student1_id,
      student1_id,
      'Anna Kovács',
      'Eötvös Loránd University',
      '+36301234567',
      80000,
      120000,
      ARRAY['District V', 'District VI', 'District VII'],
      1
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Anna Kovács',
      university = 'Eötvös Loránd University';
  END IF;

  IF student2_id IS NOT NULL THEN
    INSERT INTO public.users (id, role, email, email_verified)
    VALUES (student2_id, 'student', 'student2@test.com', true)
    ON CONFLICT (id) DO UPDATE SET role = 'student';

    INSERT INTO public.profiles_student (id, user_id, full_name, university, phone, budget_min_huf, budget_max_huf, preferred_districts, preferred_bedrooms)
    VALUES (
      student2_id,
      student2_id,
      'János Nagy',
      'Budapest University of Technology',
      '+36301234568',
      100000,
      150000,
      ARRAY['District VIII', 'District IX', 'District XI'],
      2
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'János Nagy',
      university = 'Budapest University of Technology';
  END IF;
END $$;

-- =====================================================
-- Seed owner profiles (only if users exist)
-- =====================================================

DO $$
DECLARE
  owner1_id uuid;
  owner2_id uuid;
BEGIN
  owner1_id := get_user_id_by_email('owner1@test.com');
  owner2_id := get_user_id_by_email('owner2@test.com');

  IF owner1_id IS NOT NULL THEN
    INSERT INTO public.users (id, role, email, email_verified)
    VALUES (owner1_id, 'owner', 'owner1@test.com', true)
    ON CONFLICT (id) DO UPDATE SET role = 'owner';

    INSERT INTO public.profiles_owner (id, user_id, full_name, phone, business_name, stripe_verified, verification_status)
    VALUES (
      owner1_id,
      owner1_id,
      'Péter Szabó',
      '+36301234569',
      'Szabó Properties Kft.',
      false,
      'verified'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Péter Szabó',
      business_name = 'Szabó Properties Kft.';
  END IF;

  IF owner2_id IS NOT NULL THEN
    INSERT INTO public.users (id, role, email, email_verified)
    VALUES (owner2_id, 'owner', 'owner2@test.com', true)
    ON CONFLICT (id) DO UPDATE SET role = 'owner';

    INSERT INTO public.profiles_owner (id, user_id, full_name, phone, business_name, stripe_verified, verification_status)
    VALUES (
      owner2_id,
      owner2_id,
      'Katalin Tóth',
      '+36301234570',
      'City Living Rentals',
      false,
      'verified'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = 'Katalin Tóth',
      business_name = 'City Living Rentals';
  END IF;
END $$;

-- =====================================================
-- Seed sample apartments (if owners exist)
-- =====================================================

DO $$
DECLARE
  owner1_id uuid;
  owner2_id uuid;
  apt1_id uuid;
  apt2_id uuid;
  apt3_id uuid;
BEGIN
  owner1_id := get_user_id_by_email('owner1@test.com');
  owner2_id := get_user_id_by_email('owner2@test.com');

  IF owner1_id IS NOT NULL THEN
    -- Apartment 1: District V, near university
    INSERT INTO public.apartments (
      owner_id, title, description, address, district, latitude, longitude,
      monthly_rent_huf, bedrooms, bathrooms, size_sqm, floor, total_floors,
      furnished, has_elevator, available_from, lease_min_months, lease_max_months,
      deposit_months, utilities_included, pets_allowed, smoking_allowed,
      owner_verified, distance_to_metro_m, distance_to_university_m
    ) VALUES (
      owner1_id,
      'Bright Studio Near University',
      'Cozy studio apartment in the heart of District V, perfect for students. Walking distance to ELTE and metro stations. Fully furnished with modern amenities.',
      'Váci utca 45, District V, Budapest',
      'District V',
      47.4979,
      19.0542,
      95000,
      1,
      1,
      35,
      3,
      5,
      true,
      true,
      CURRENT_DATE + INTERVAL '2 weeks',
      6,
      12,
      2.0,
      false,
      false,
      false,
      true,
      250,
      400
    )
    RETURNING id INTO apt1_id;

    -- Add amenities for apartment 1
    IF apt1_id IS NOT NULL THEN
      INSERT INTO public.apartment_amenities (apartment_id, amenity_code)
      SELECT apt1_id, code FROM public.amenities
      WHERE code IN ('wifi', 'washing_machine', 'air_conditioning', 'furnished')
      ON CONFLICT DO NOTHING;
    END IF;

    -- Apartment 2: District VII, larger space
    INSERT INTO public.apartments (
      owner_id, title, description, address, district, latitude, longitude,
      monthly_rent_huf, bedrooms, bathrooms, size_sqm, floor, total_floors,
      furnished, has_elevator, available_from, lease_min_months, lease_max_months,
      deposit_months, utilities_included, pets_allowed, smoking_allowed,
      owner_verified, distance_to_metro_m, distance_to_university_m
    ) VALUES (
      owner1_id,
      'Spacious 2-Bedroom in Jewish Quarter',
      'Beautiful 2-bedroom apartment in the vibrant District VII. High ceilings, renovated kitchen, and plenty of natural light. Close to ruin bars and restaurants.',
      'Dob utca 27, District VII, Budapest',
      'District VII',
      47.4979,
      19.0635,
      135000,
      2,
      1,
      55,
      2,
      4,
      true,
      false,
      CURRENT_DATE + INTERVAL '1 month',
      6,
      24,
      2.0,
      true,
      true,
      false,
      true,
      180,
      1200
    )
    RETURNING id INTO apt2_id;

    IF apt2_id IS NOT NULL THEN
      INSERT INTO public.apartment_amenities (apartment_id, amenity_code)
      SELECT apt2_id, code FROM public.amenities
      WHERE code IN ('wifi', 'dishwasher', 'balcony', 'furnished', 'pets_allowed')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  IF owner2_id IS NOT NULL THEN
    -- Apartment 3: District IX, modern building
    INSERT INTO public.apartments (
      owner_id, title, description, address, district, latitude, longitude,
      monthly_rent_huf, bedrooms, bathrooms, size_sqm, floor, total_floors,
      furnished, has_elevator, available_from, lease_min_months, lease_max_months,
      deposit_months, utilities_included, pets_allowed, smoking_allowed,
      owner_verified, distance_to_metro_m, distance_to_university_m
    ) VALUES (
      owner2_id,
      'Modern Studio with Gym Access',
      'Brand new studio in a modern building with elevator, gym, and communal terrace. Perfect for students who value comfort and convenience. Near Corvin Quarter.',
      'Ferenc körút 38, District IX, Budapest',
      'District IX',
      47.4813,
      19.0789,
      110000,
      1,
      1,
      40,
      7,
      10,
      true,
      true,
      CURRENT_DATE,
      3,
      12,
      1.0,
      true,
      false,
      false,
      true,
      120,
      800
    )
    RETURNING id INTO apt3_id;

    IF apt3_id IS NOT NULL THEN
      INSERT INTO public.apartment_amenities (apartment_id, amenity_code)
      SELECT apt3_id, code FROM public.amenities
      WHERE code IN ('wifi', 'air_conditioning', 'gym', 'furnished', 'parking')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- =====================================================
-- Seed sample conversations (if users and apartments exist)
-- =====================================================

DO $$
DECLARE
  student1_id uuid;
  owner1_id uuid;
  apt1_id uuid;
  conv1_id uuid;
BEGIN
  student1_id := get_user_id_by_email('student1@test.com');
  owner1_id := get_user_id_by_email('owner1@test.com');

  -- Get first apartment
  SELECT id INTO apt1_id FROM public.apartments LIMIT 1;

  IF student1_id IS NOT NULL AND owner1_id IS NOT NULL AND apt1_id IS NOT NULL THEN
    -- Create a conversation
    INSERT INTO public.conversations (apartment_id, student_id, owner_id, status)
    VALUES (apt1_id, student1_id, owner1_id, 'active')
    RETURNING id INTO conv1_id;

    -- Add some messages
    IF conv1_id IS NOT NULL THEN
      INSERT INTO public.messages (conversation_id, sender_id, content, created_at)
      VALUES
        (conv1_id, student1_id, 'Hi! I''m interested in viewing this apartment. Is it still available?', NOW() - INTERVAL '2 days'),
        (conv1_id, owner1_id, 'Hello Anna! Yes, the apartment is still available. When would you like to schedule a viewing?', NOW() - INTERVAL '1 day 20 hours'),
        (conv1_id, student1_id, 'Great! Would this Friday afternoon work for you? Around 3 PM?', NOW() - INTERVAL '1 day 18 hours'),
        (conv1_id, owner1_id, 'Friday at 3 PM works perfectly. I''ll send you the exact address and meeting point. Looking forward to showing you the apartment!', NOW() - INTERVAL '1 day 16 hours');
    END IF;
  END IF;
END $$;

-- =====================================================
-- Clean up helper function
-- =====================================================
DROP FUNCTION IF EXISTS get_user_id_by_email(text);

-- =====================================================
-- Verification query
-- =====================================================
-- Run this to verify the seed data was created:
/*
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Student Profiles', COUNT(*) FROM public.profiles_student
UNION ALL
SELECT 'Owner Profiles', COUNT(*) FROM public.profiles_owner
UNION ALL
SELECT 'Apartments', COUNT(*) FROM public.apartments
UNION ALL
SELECT 'Conversations', COUNT(*) FROM public.conversations
UNION ALL
SELECT 'Messages', COUNT(*) FROM public.messages;
*/
