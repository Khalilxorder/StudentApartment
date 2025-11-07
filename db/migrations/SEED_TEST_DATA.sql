-- =====================================================
-- SEED TEST DATA
-- Run this in Supabase SQL Editor after ALL_IN_ONE_MIGRATION.sql
-- =====================================================

-- =====================================================
-- Step 1: Insert Test Users
-- =====================================================

-- Student 1
INSERT INTO public.users (id, role, email, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid, 
  'student', 
  'student1@test.com', 
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles_student 
  (id, user_id, full_name, phone, university, budget_min_huf, budget_max_huf, preferred_bedrooms)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid, 
  '550e8400-e29b-41d4-a716-446655440001'::uuid, 
  'Anna Kovács', 
  '+36 30 123 4567',
  'Eötvös Loránd University', 
  200000,
  300000,
  1
)
ON CONFLICT (id) DO NOTHING;

-- Student 2
INSERT INTO public.users (id, role, email, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid, 
  'student', 
  'student2@test.com', 
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles_student 
  (id, user_id, full_name, phone, university, budget_min_huf, budget_max_huf, preferred_bedrooms)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid, 
  '550e8400-e29b-41d4-a716-446655440002'::uuid, 
  'János Nagy', 
  '+36 30 234 5678',
  'Budapest University of Technology', 
  180000,
  280000,
  2
)
ON CONFLICT (id) DO NOTHING;

-- Owner 1
INSERT INTO public.users (id, role, email, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440011'::uuid, 
  'owner', 
  'owner1@test.com', 
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles_owner 
  (id, user_id, full_name, phone, business_name, verification_status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440011'::uuid, 
  '550e8400-e29b-41d4-a716-446655440011'::uuid, 
  'Péter Szabó', 
  '+36 30 345 6789',
  'Szabó Properties Kft.',
  'verified'
)
ON CONFLICT (id) DO NOTHING;

-- Owner 2
INSERT INTO public.users (id, role, email, email_verified)
VALUES (
  '550e8400-e29b-41d4-a716-446655440012'::uuid, 
  'owner', 
  'owner2@test.com', 
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles_owner 
  (id, user_id, full_name, phone, business_name, verification_status)
VALUES (
  '550e8400-e29b-41d4-a716-446655440012'::uuid, 
  '550e8400-e29b-41d4-a716-446655440012'::uuid, 
  'Katalin Tóth', 
  '+36 30 456 7890',
  'City Living Rentals',
  'verified'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 2: Insert Test Apartments
-- =====================================================

INSERT INTO public.apartments (
  id, owner_id, title, description, monthly_rent_huf, 
  bedrooms, bathrooms, square_meters, 
  city, district, address, 
  lease_min_months, lease_max_months, deposit_months,
  utilities_included, pets_allowed, smoking_allowed,
  available_from, owner_verified,
  distance_to_metro_m, distance_to_university_m,
  amenities
) VALUES (
  '550e8400-e29b-41d4-a716-446655550001'::uuid,
  '550e8400-e29b-41d4-a716-446655440011'::uuid,
  'Modern 1-bedroom near ELTE',
  'Beautiful modern apartment close to Eötvös Loránd University. Recently renovated with modern amenities.',
  150000,
  1, 1, 45,
  'Budapest', '7', 'Kazinczy utca 12.',
  6, 24, 1.0,
  true, true, false,
  '2025-01-01'::date, true,
  450, 800,
  '["wifi", "ac", "kitchen", "balcony"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.apartments (
  id, owner_id, title, description, monthly_rent_huf, 
  bedrooms, bathrooms, square_meters, 
  city, district, address, 
  lease_min_months, lease_max_months, deposit_months,
  utilities_included, pets_allowed, smoking_allowed,
  available_from, owner_verified,
  distance_to_metro_m, distance_to_university_m,
  amenities
) VALUES (
  '550e8400-e29b-41d4-a716-446655550002'::uuid,
  '550e8400-e29b-41d4-a716-446655440011'::uuid,
  '2-bedroom apartment near Metro M1',
  'Spacious 2-bedroom apartment with direct metro access. Perfect for couples or roommates.',
  280000,
  2, 1, 65,
  'Budapest', '6', 'Andrássy út 45.',
  6, 24, 1.0,
  false, false, false,
  '2025-02-01'::date, true,
  120, 2500,
  '["wifi", "kitchen", "garden"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.apartments (
  id, owner_id, title, description, monthly_rent_huf, 
  bedrooms, bathrooms, square_meters, 
  city, district, address, 
  lease_min_months, lease_max_months, deposit_months,
  utilities_included, pets_allowed, smoking_allowed,
  available_from, owner_verified,
  distance_to_metro_m, distance_to_university_m,
  amenities
) VALUES (
  '550e8400-e29b-41d4-a716-446655550003'::uuid,
  '550e8400-e29b-41d4-a716-446655440012'::uuid,
  'Cozy studio in central Budapest',
  'Studio apartment in the heart of Budapest with all modern conveniences.',
  120000,
  0, 1, 32,
  'Budapest', '5', 'Zöldfa utca 78.',
  3, 12, 0.5,
  true, true, true,
  '2025-01-15'::date, true,
  280, 1200,
  '["wifi", "ac", "furnished"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Step 3: Insert Test Conversation
-- =====================================================

INSERT INTO public.conversations (
  id, apartment_id, student_id, owner_id, status, 
  last_message_at, last_message_preview,
  unread_count_student, unread_count_owner
) VALUES (
  '550e8400-e29b-41d4-a716-446655660001'::uuid,
  '550e8400-e29b-41d4-a716-446655550001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '550e8400-e29b-41d4-a716-446655440011'::uuid,
  'active',
  now(),
  'Hi, I am interested in this apartment!',
  0, 1
)
ON CONFLICT (id, apartment_id, student_id) DO NOTHING;

-- =====================================================
-- Step 4: Insert Test Messages
-- =====================================================

INSERT INTO public.messages (
  id, conversation_id, sender_id, content, message_type, created_at
) VALUES 
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655660001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Hi, I am interested in this apartment!',
  'text',
  now() - interval '30 minutes'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655660001'::uuid,
  '550e8400-e29b-41d4-a716-446655440011'::uuid,
  'Hello! Thanks for your interest. When would you like to visit?',
  'text',
  now() - interval '25 minutes'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655660001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'How about tomorrow at 3 PM?',
  'text',
  now() - interval '20 minutes'
),
(
  gen_random_uuid(),
  '550e8400-e29b-41d4-a716-446655660001'::uuid,
  '550e8400-e29b-41d4-a716-446655440011'::uuid,
  'Perfect! See you then.',
  'text',
  now() - interval '15 minutes'
);

-- =====================================================
-- Verification Queries
-- =====================================================

SELECT 'USERS' as entity, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'STUDENT PROFILES', COUNT(*) FROM public.profiles_student
UNION ALL
SELECT 'OWNER PROFILES', COUNT(*) FROM public.profiles_owner
UNION ALL
SELECT 'APARTMENTS', COUNT(*) FROM public.apartments
UNION ALL
SELECT 'CONVERSATIONS', COUNT(*) FROM public.conversations
UNION ALL
SELECT 'MESSAGES', COUNT(*) FROM public.messages;

-- Expected results:
-- USERS | 4
-- STUDENT PROFILES | 2
-- OWNER PROFILES | 2
-- APARTMENTS | 3
-- CONVERSATIONS | 1
-- MESSAGES | 4

-- List all users for reference
SELECT 'USERS' as entity, email, role FROM public.users ORDER BY email;

-- List all apartments
SELECT 'APARTMENTS' as entity, title, monthly_rent_huf FROM public.apartments ORDER BY created_at;

-- =====================================================
-- All seed data inserted successfully! ✅
-- =====================================================
