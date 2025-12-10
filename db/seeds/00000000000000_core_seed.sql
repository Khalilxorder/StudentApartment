-- Seed data for core tables (universities, amenities, sample apartments)

-- Universities ----------------------------------------------------------------
INSERT INTO public.universities (id, name, campus, latitude, longitude)
VALUES
  ('elte', 'Eötvös Loránd University', 'Central Campus', 47.4816, 19.0585),
  ('bme', 'Budapest University of Technology and Economics', 'Danube Campus', 47.4814, 19.0605),
  ('corvinus', 'Corvinus University of Budapest', 'River Campus', 47.4860, 19.0584)
ON CONFLICT (id) DO NOTHING;

-- Amenities catalog -----------------------------------------------------------
INSERT INTO public.amenities (code, category, label, description)
VALUES
  ('amen_wifi', 'Connectivity', 'High-speed Wi-Fi', 'Reliable Wi-Fi suitable for streaming and study'),
  ('amen_study_lounge', 'Community', 'Study lounge', 'Shared quiet study space'),
  ('amen_shared_kitchen', 'Community', 'Shared kitchen', 'Fully equipped shared kitchen'),
  ('amen_washing_machine', 'Utilities', 'Washing machine', 'In-unit washing machine'),
  ('amen_balcony', 'Comfort', 'Balcony', 'Private balcony for fresh air'),
  ('amen_elevator', 'Accessibility', 'Elevator', 'Elevator access'),
  ('amen_aircon', 'Comfort', 'Air conditioning', 'Cooling for summer months'),
  ('amen_bike_storage', 'Amenities', 'Bike storage', 'Secure indoor bicycle storage'),
  ('amen_security', 'Safety', 'Secure entry', 'Controlled entry and CCTV in common areas'),
  ('amen_cleaning', 'Services', 'Weekly cleaning', 'Weekly common-area cleaning included')
ON CONFLICT (code) DO NOTHING;

-- Sample apartments -----------------------------------------------------------
WITH upsert_apartment AS (
  INSERT INTO public.apartments (
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
    completeness_score,
    media_quality_score,
    published_at
  ) VALUES
    (
      'Sunny studio near ELTE',
      'Bright furnished studio with modern kitchen, perfect for ELTE students. 8-minute walk to campus and close to tram 4/6.',
      150000,
      1,
      0,
      1,
      28,
      3,
      6,
      true,
      true,
      'Múzeum körút 12, Budapest',
      'V',
      47.4885,
      19.0612,
      'published',
      true,
      0.92,
      0.88,
      now()
    ),
    (
      'Two-bedroom flat by BME campus',
      'Renovated 2BR apartment overlooking the Danube. Ideal for roommates, 5-minute walk to BME, transit at your door.',
      245000,
      3,
      2,
      1,
      54,
      5,
      8,
      true,
      true,
      'Budafoki út 15, Budapest',
      'XI',
      47.4781,
      19.0551,
      'published',
      true,
      0.95,
      0.91,
      now()
    ),
    (
      'Loft apartment in Corvinus district',
      'Industrial-style loft with mezzanine sleeping area and dedicated study nook. Excellent transit links and nightlife.',
      198000,
      2,
      1,
      1,
      40,
      2,
      4,
      true,
      false,
      'Közraktár utca 4, Budapest',
      'IX',
      47.4863,
      19.0638,
      'published',
      true,
      0.89,
      0.82,
      now()
    )
  ON CONFLICT DO NOTHING
  RETURNING id, title
)
SELECT * FROM upsert_apartment;

-- Link amenities --------------------------------------------------------------
WITH target_apartments AS (
  SELECT id, title FROM public.apartments
  WHERE title IN ('Sunny studio near ELTE', 'Two-bedroom flat by BME campus', 'Loft apartment in Corvinus district')
)
INSERT INTO public.apartment_amenities (apartment_id, amenity_code)
SELECT a.id,
       unnest(CASE a.title
         WHEN 'Sunny studio near ELTE' THEN ARRAY['amen_wifi','amen_washing_machine','amen_security','amen_shared_kitchen']
         WHEN 'Two-bedroom flat by BME campus' THEN ARRAY['amen_wifi','amen_balcony','amen_elevator','amen_bike_storage','amen_security']
         WHEN 'Loft apartment in Corvinus district' THEN ARRAY['amen_wifi','amen_aircon','amen_shared_kitchen','amen_study_lounge','amen_security']
       END)
FROM target_apartments a
ON CONFLICT DO NOTHING;

-- Media entries ---------------------------------------------------------------
WITH target_apartments AS (
  SELECT id, title FROM public.apartments
  WHERE title IN ('Sunny studio near ELTE', 'Two-bedroom flat by BME campus', 'Loft apartment in Corvinus district')
)
INSERT INTO public.apartment_media (apartment_id, file_url, storage_path, blurhash, width, height, quality_score, is_primary)
SELECT a.id,
       CONCAT('https://cdn.student-apartments.test/', encode(gen_random_uuid(), 'hex'), '.webp'),
       CONCAT('apartments/', a.id, '/primary.webp'),
       'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
       1920,
       1280,
       0.9,
       true
FROM target_apartments a
ON CONFLICT DO NOTHING;

-- Commute cache seed ---------------------------------------------------------
INSERT INTO public.commute_cache (apartment_id, university_id, mode, travel_minutes, distance_meters)
SELECT a.id, u.id, 'transit', FLOOR(12 + random() * 8), FLOOR(1200 + random() * 800)
FROM public.apartments a
JOIN public.universities u ON (
  (a.title LIKE '%ELTE%' AND u.id = 'elte') OR
  (a.title LIKE '%BME%' AND u.id = 'bme') OR
  (a.title LIKE '%Corvinus%' AND u.id = 'corvinus')
)
ON CONFLICT DO NOTHING;

