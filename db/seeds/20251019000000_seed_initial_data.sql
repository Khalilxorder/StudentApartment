-- Migration: Seed data for Budapest universities and districts
-- Date: 2025-10-19
-- Purpose: Populate initial data for development and testing

-- ============================================
-- University Data
-- ============================================

-- Insert Budapest universities
INSERT INTO public.universities (id, name, campus, latitude, longitude, created_at) VALUES
('elte', 'Eötvös Loránd University', 'Main Campus', 47.4736, 19.0604, now()),
('bme', 'Budapest University of Technology and Economics', 'Main Campus', 47.4814, 19.0556, now()),
('corvinus', 'Corvinus University of Budapest', 'Main Campus', 47.4924, 19.0604, now()),
('pazmany', 'Pázmány Péter Catholic University', 'Faculty of Law and Political Sciences', 47.4969, 19.0658, now()),
('semmelweis', 'Semmelweis University', 'Main Campus', 47.4919, 19.0760, now()),
('mkk', 'Hungarian University of Fine Arts', 'Main Campus', 47.4981, 19.0652, now()),
('oe', 'Óbuda University', 'Main Campus', 47.5536, 19.0339, now()),
('ppke', 'Pázmány Péter Catholic University', 'Piac tér Campus', 47.4981, 19.0652, now())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Amenities Catalog
-- ============================================

-- Insert standard apartment amenities
INSERT INTO public.amenities (code, category, label, description) VALUES
-- Location & Transport
('loc_metro', 'location', 'Metro Access', 'Within walking distance of metro station'),
('loc_tram', 'location', 'Tram Stop', 'Near tram or bus stop'),
('loc_university', 'location', 'Near University', 'Close to university campus'),
('loc_city_center', 'location', 'City Center', 'Located in city center'),
('loc_quiet_street', 'location', 'Quiet Street', 'Peaceful residential area'),
('loc_park', 'location', 'Near Park', 'Close to green spaces'),
('loc_grocery', 'location', 'Near Grocery', 'Convenient shopping access'),
('loc_shopping', 'location', 'Near Shopping', 'Close to shopping centers'),

-- Amenities
('amen_furnished', 'amenities', 'Furnished', 'Fully furnished apartment'),
('amen_wifi', 'amenities', 'WiFi', 'High-speed internet included'),
('amen_ac', 'amenities', 'Air Conditioning', 'Air conditioning available'),
('amen_heating', 'amenities', 'Central Heating', 'Central heating system'),
('amen_washing_machine', 'amenities', 'Washing Machine', 'In-unit laundry'),
('amen_dishwasher', 'amenities', 'Dishwasher', 'Dishwasher included'),
('amen_balcony', 'amenities', 'Balcony', 'Private balcony'),
('amen_terrace', 'amenities', 'Terrace', 'Private terrace'),
('amen_garden', 'amenities', 'Garden Access', 'Access to garden'),
('amen_parking_garage', 'amenities', 'Garage Parking', 'Secure garage parking'),
('amen_parking_street', 'amenities', 'Street Parking', 'Street parking available'),
('amen_elevator', 'amenities', 'Elevator', 'Building has elevator'),
('amen_pets_allowed', 'amenities', 'Pets Allowed', 'Pet-friendly apartment'),

-- Utilities
('util_low_bills', 'utilities', 'Low Utility Bills', 'Energy efficient, low bills'),
('util_individual_meters', 'utilities', 'Individual Meters', 'Separate utility meters'),
('util_internet_included', 'utilities', 'Internet Included', 'Internet cost included'),
('util_water_included', 'utilities', 'Water Included', 'Water cost included'),
('util_heating_included', 'utilities', 'Heating Included', 'Heating cost included'),

-- Safety & Security
('safe_locked_entrance', 'safety', 'Locked Entrance', 'Secure building entrance'),
('safe_intercom', 'safety', 'Intercom System', 'Building intercom'),
('safe_gated', 'safety', 'Gated Community', 'Secure gated community'),
('safe_security_guard', 'safety', 'Security Guard', '24/7 security personnel'),
('safe_well_lit', 'safety', 'Well Lit', 'Well-lit common areas'),
('safe_cctv', 'safety', 'CCTV Cameras', 'Security camera surveillance'),

-- Style & Quality
('style_modern', 'style', 'Modern', 'Modern interior design'),
('style_renovated', 'style', 'Recently Renovated', 'Recently renovated'),
('style_high_ceiling', 'style', 'High Ceilings', 'High ceiling apartment'),
('style_bright', 'style', 'Bright & Sunny', 'Lots of natural light'),
('style_spacious', 'style', 'Spacious', 'Generous living space'),
('style_luxury', 'style', 'Luxury Finishes', 'High-end finishes'),
('style_minimalist', 'style', 'Minimalist', 'Clean, minimalist design'),

-- Social & Community
('social_students_only', 'social', 'Students Only', 'Student housing community'),
('social_international', 'social', 'International Community', 'Diverse international residents'),
('social_quiet', 'social', 'Quiet Environment', 'Peaceful living environment'),
('social_social', 'social', 'Social Atmosphere', 'Active social community'),
('social_roommates', 'social', 'Roommate Friendly', 'Suitable for sharing'),
('social_couples_welcome', 'social', 'Couples Welcome', 'Accepts couples'),

-- Legal & Administrative
('legal_registered', 'legal', 'Registered', 'Officially registered rental'),
('legal_foreigner_friendly', 'legal', 'Foreigner Friendly', 'Suitable for international students'),
('legal_short_term', 'legal', 'Short-term Available', 'Short-term rentals available'),
('legal_long_term', 'legal', 'Long-term Available', 'Long-term leases available'),

-- Connectivity & Tech
('conn_fiber', 'connectivity', 'Fiber Internet', 'High-speed fiber connection'),
('conn_smart_home', 'connectivity', 'Smart Home', 'Smart home features'),
('conn_streaming', 'connectivity', 'Streaming Ready', 'Good for streaming services'),

-- Accessibility
('access_wheelchair', 'accessibility', 'Wheelchair Accessible', 'Wheelchair accessible'),
('access_ground_floor', 'accessibility', 'Ground Floor', 'No stairs to enter'),
('access_ramp', 'accessibility', 'Ramp Access', 'Ramp for easy access'),

-- Additional Features
('extra_storage', 'additional', 'Extra Storage', 'Additional storage space'),
('extra_bike_storage', 'additional', 'Bike Storage', 'Secure bike storage'),
('extra_laundry', 'additional', 'Laundry Facilities', 'On-site laundry'),
('extra_gym', 'additional', 'Gym Access', 'Building gym access'),
('extra_pool', 'additional', 'Swimming Pool', 'Building pool access'),
('extra_sauna', 'additional', 'Sauna', 'Building sauna access')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- Sample Apartments for Testing
-- ============================================

-- Insert sample apartments (only if no apartments exist)
INSERT INTO public.apartments (
  owner_id,
  title,
  description,
  monthly_rent_huf,
  room_count,
  bedrooms,
  bathrooms,
  size_sqm,
  floor,
  total_floors,
  furnished,
  has_elevator,
  address,
  district,
  latitude,
  longitude,
  status,
  is_available,
  completeness_score
) VALUES
-- ELTE area apartments
(
  (SELECT id FROM auth.users LIMIT 1), -- Will be replaced with actual owner
  'Cozy Studio near ELTE University',
  'Perfect student studio apartment located just 5 minutes walk from ELTE main campus. Fully furnished with modern amenities.',
  120000,
  1,
  1,
  1,
  25,
  2,
  4,
  true,
  true,
  'Ferenciek tere 2, Budapest',
  'District 5',
  47.4969,
  19.0544,
  'published',
  true,
  0.85
),
(
  (SELECT id FROM auth.users LIMIT 1),
  'Modern 2BR Apartment in District 6',
  'Spacious 2-bedroom apartment with balcony, perfect for roommates. Close to nightlife and public transport.',
  180000,
  2,
  2,
  1,
  55,
  3,
  5,
  true,
  true,
  'Király utca 12, Budapest',
  'District 6',
  47.4981,
  19.0652,
  'published',
  true,
  0.92
),
-- BME area apartments
(
  (SELECT id FROM auth.users LIMIT 1),
  'Student Housing near BME',
  'Affordable student apartment ideal for engineering students. Close to BME campus and metro access.',
  95000,
  1,
  1,
  1,
  22,
  1,
  3,
  true,
  false,
  'Bartók Béla út 4, Budapest',
  'District 11',
  47.4736,
  19.0604,
  'published',
  true,
  0.78
),
-- Corvinus area apartments
(
  (SELECT id FROM auth.users LIMIT 1),
  'Luxury Studio near Corvinus',
  'High-end studio apartment with premium finishes. Perfect for business students at Corvinus University.',
  160000,
  1,
  1,
  1,
  35,
  4,
  6,
  true,
  true,
  'Fővám tér 8, Budapest',
  'District 9',
  47.4924,
  19.0604,
  'published',
  true,
  0.95
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Sample Commute Cache Data
-- ============================================

-- Insert sample commute data for universities
INSERT INTO public.commute_cache (
  apartment_id,
  university_id,
  mode,
  travel_minutes,
  distance_meters,
  updated_at
) VALUES
-- ELTE commutes
(
  (SELECT id FROM public.apartments WHERE title LIKE '%ELTE%' LIMIT 1),
  'elte',
  'walking',
  8,
  650,
  now()
),
(
  (SELECT id FROM public.apartments WHERE title LIKE '%ELTE%' LIMIT 1),
  'elte',
  'transit',
  5,
  450,
  now()
),
-- BME commutes
(
  (SELECT id FROM public.apartments WHERE title LIKE '%BME%' LIMIT 1),
  'bme',
  'walking',
  12,
  950,
  now()
),
(
  (SELECT id FROM public.apartments WHERE title LIKE '%BME%' LIMIT 1),
  'bme',
  'transit',
  7,
  600,
  now()
),
-- Corvinus commutes
(
  (SELECT id FROM public.apartments WHERE title LIKE '%Corvinus%' LIMIT 1),
  'corvinus',
  'walking',
  6,
  480,
  now()
),
(
  (SELECT id FROM public.apartments WHERE title LIKE '%Corvinus%' LIMIT 1),
  'corvinus',
  'transit',
  4,
  350,
  now()
)
ON CONFLICT (apartment_id, university_id, mode) DO NOTHING;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE public.universities IS 'Budapest universities and their locations for commute calculations';
COMMENT ON TABLE public.amenities IS 'Catalog of apartment amenities and features';</content>
<parameter name="filePath">c:\Users\Administrator\Desktop\SA\db\seeds\20251019000000_seed_initial_data.sql