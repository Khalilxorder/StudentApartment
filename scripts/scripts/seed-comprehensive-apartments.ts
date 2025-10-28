// FILE: scripts/seed-comprehensive-apartments.ts
// Comprehensive realistic Budapest apartment listings with full details
// Run: npm run seed:comprehensive

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const comprehensiveApartments = [
  // 1. Premium VI. kerület
  {
    title: "Renovated 2-room flat near Andrássy Avenue - 315 000 Ft/hó",
    description: "📍 VI. kerület (Terézváros), Hunyadi tér\n💰 315 000 Ft/month + 24 000 Ft common cost + utilities (~20-30k)\n📏 60 m², 2 rooms + ½ bathroom, 2nd floor, brick building\n\nBright apartment in the heart of Terézváros. Fully renovated with modern amenities, just steps from Oktogon metro (M1). Perfect for professionals or couples who want to live centrally.\n\n✨ FEATURES:\n• Fully furnished (sofa, bed, wardrobes, dining table)\n• Separate fully equipped kitchen (fridge, oven, dishwasher)\n• Gas heating (cirkó boiler), air conditioning\n• Balcony 5 m² with street view\n• High-speed internet available\n• Building: Brick 3-story, built 1910s, refurbished, no elevator\n• Courtyard bike storage\n\n🚇 TRANSPORT: Metro M1 Oktogon, Tram 4/6, walking distance to ELTE, Nyugati station\n\n📋 RENTAL TERMS:\n• Min lease: 12 months\n• Deposit: 2 months rent (630 000 Ft)\n• Available: Immediately\n• Common cost includes water\n\n🚫 RULES: No pets, no smoking, children allowed\n👥 Preferred: Single professional or couple\n\n✅ Quiet street, close to metro and trams. Ideal for remote workers or young professionals.",
    price_huf: 315000,
    district: 6,
    address: "Hunyadi tér 8, VI. kerület, Budapest",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 60,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.5089,
    longitude: 19.0667,
    is_available: true,
    pet_friendly: false,
    smoking_allowed: false,
    heating_type: "gas boiler",
    cooling_type: "air conditioning",
    internet_included: false,
    parking_available: false,
    building_age: 114,
    lease_min_months: 12,
    amenities: ["balcony", "renovated", "AC", "dishwasher", "bike storage"],
    utilities_included: ["water"],
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]
  },

  // 2. Budget VIII. kerület student
  {
    title: "Cozy 1 szobás lakás near ELTE - Students Welcome",
    description: "Affordable 32 m² studio apartment in Józsefváros, perfect for ELTE students. 5 min walk to campus, near Kálvin tér metro. Partially furnished (bed, desk, wardrobe). Central heating (távfűtés) included in common cost. Building is older panel block but well-maintained. Shared washing machine in basement. Internet ready, just need contract. Ideal for quiet student focused on studies. Min 6 months lease. Deposit 1.5 months. Available from November 1.",
    price_huf: 145000,
    district: 8,
    address: "Bródy Sándor utca 18, VIII. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 32,
    floor_number: 4,
    furnishing: "partially_furnished",
    elevator: "yes",
    latitude: 47.4933,
    longitude: 19.0667,
    is_available: true,
    common_cost: 18000,
    utilities_estimate: "15000-20000 Ft/month",
    property_type: "panel flat",
    condition: "good",
    heating_type: "central heating (távfűtés)",
    cooling: false,
    internet_available: true,
    parking: "street (free)",
    building_year: 1975,
    building_floors: 10,
    view_type: "courtyard",
    minimum_lease: "6 months",
    deposit_months: 1.5,
    available_from: "2025-11-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "students only",
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 3. Luxury V. kerület
  {
    title: "Exclusive 3-room Penthouse with Terrace - Belváros",
    description: "Stunning 95 m² penthouse in District V with private 25 m² terrace and panoramic city views. Newly built luxury complex (2022) with underground garage, 24/7 security, gym. Fully furnished with designer furniture, all premium appliances (Bosch, Siemens). Floor heating, AC in all rooms, smart home system. Walking distance to Deák Ferenc tér, Parliament. Common cost includes water, heating, security. Perfect for executives or diplomats. 1 year minimum lease, 3 months deposit. References required. Available immediately.",
    price_huf: 595000,
    district: 5,
    address: "Szabadság tér 12, V. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 2,
    kitchen: 1,
    balcony: 1,
    size_sqm: 95,
    floor_number: 7,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.5052,
    longitude: 19.0522,
    is_available: true,
    common_cost: 45000,
    utilities_estimate: "35000-50000 Ft/month",
    property_type: "new development",
    condition: "newly built",
    heating_type: "floor heating + central",
    cooling: true,
    internet_available: true,
    parking: "underground garage included",
    building_year: 2022,
    building_floors: 8,
    view_type: "panoramic city view",
    minimum_lease: "12 months",
    deposit_months: 3,
    available_from: "immediately",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "professionals or executives",
    image_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
    ]
  },

  // 4. BME student special
  {
    title: "Modern Studio 100m from BME - Műegyetem",
    description: "Perfect for engineering students! 28 m² fully furnished studio literally across the street from BME main building. Ground floor with separate entrance, ideal for bike storage. Recently renovated, gas heating, washing machine in unit. Fast WiFi (500 Mbps included in rent). Desk setup perfect for CAD work. Quiet study environment. Landlord understands student schedules. Common cost includes water. Flexible lease 6-12 months. 1 month deposit. Available September 1. Students only, no parties, non-smoking.",
    price_huf: 158000,
    district: 11,
    address: "Műegyetem rakpart 3, XI. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 28,
    floor_number: 0,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4811,
    longitude: 19.0611,
    is_available: true,
    common_cost: 12000,
    utilities_estimate: "12000-18000 Ft/month",
    property_type: "brick apartment",
    condition: "renovated",
    heating_type: "gas boiler",
    cooling: false,
    internet_available: true,
    parking: "bike storage",
    building_year: 1960,
    building_floors: 3,
    view_type: "garden",
    minimum_lease: "6 months",
    deposit_months: 1,
    available_from: "2025-09-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "BME students only",
    image_urls: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"
    ]
  },

  // 5. Family XIII. kerület
  {
    title: "Spacious 4-room Family Apartment - Újlipótváros",
    description: "Beautiful 85 m² family apartment in peaceful Újlipótváros. 3 bedrooms + living room, perfect for family or 3 friends. Separate kitchen fully equipped. 2 balconies (10 m² total). Building from 1930s, brick construction, beautifully maintained. Elevator, bike storage, playground in courtyard. Near Westend shopping center, metro M3. Partially furnished (can remove furniture if needed). Central heating included in common cost. Children welcome, pets negotiable. 12-month minimum lease, 2 months deposit. Available December 1.",
    price_huf: 385000,
    district: 13,
    address: "Szent István körút 28, XIII. kerület, Budapest",
    bedrooms: 4,
    bathrooms: 1,
    kitchen: 1,
    balcony: 2,
    size_sqm: 85,
    floor_number: 3,
    furnishing: "partially_furnished",
    elevator: "yes",
    latitude: 47.5389,
    longitude: 19.0678,
    is_available: true,
    common_cost: 32000,
    utilities_estimate: "30000-45000 Ft/month",
    property_type: "brick apartment",
    condition: "good",
    heating_type: "central heating (távfűtés)",
    cooling: false,
    internet_available: true,
    parking: "courtyard (free)",
    building_year: 1935,
    building_floors: 4,
    view_type: "courtyard + street",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-12-01",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "families or professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800"
    ]
  },

  // 6. Trendy VII. kerület
  {
    title: "Industrial Loft in Jewish Quarter - Kazinczy utca",
    description: "Unique 55 m² loft-style apartment in the heart of ruin bar district. High ceilings (3.5m), exposed brick walls, open-plan living. Renovated warehouse building with modern amenities. 1 bedroom + open living/kitchen area. Fully furnished with design pieces. AC, washing machine, dishwasher. Fiber internet included. Street-facing but double-glazed windows. Walking distance to everything - bars, restaurants, shops. Perfect for young professionals who love city life. No elevator but only 1st floor. 12 months lease, 2 months deposit. No pets, no smoking. Available immediately.",
    price_huf: 295000,
    district: 7,
    address: "Kazinczy utca 22, VII. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 55,
    floor_number: 1,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4969,
    longitude: 19.0644,
    is_available: true,
    common_cost: 22000,
    utilities_estimate: "20000-28000 Ft/month",
    property_type: "renovated warehouse",
    condition: "renovated",
    heating_type: "gas combi boiler",
    cooling: true,
    internet_available: true,
    parking: "street (paid zone)",
    building_year: 1890,
    building_floors: 2,
    view_type: "street-facing",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "immediately",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "young professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800"
    ]
  },

  // 7. Green XI. kerület
  {
    title: "Garden Apartment in Gellért Hill Area - Buda Side",
    description: "Peaceful 48 m² ground floor apartment with 30 m² private garden! Rare opportunity in beautiful Buda neighborhood. 1 large bedroom, separate kitchen, bathroom with bathtub. Partially furnished (bed, wardrobe, kitchen table). Garden access perfect for pets or outdoor dining. Gas heating, quiet residential street. 10 min walk to Gellért fürdő, tram 19/41/56. Safe family area with schools, shops nearby. Building from 1960s, brick construction. Pet-friendly landlord - small/medium dogs welcome! 12 months minimum, 2 months deposit. Available October 15.",
    price_huf: 245000,
    district: 11,
    address: "Bartók Béla út 78, XI. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 48,
    floor_number: 0,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4722,
    longitude: 19.0544,
    is_available: true,
    common_cost: 18000,
    utilities_estimate: "18000-25000 Ft/month",
    property_type: "brick apartment",
    condition: "good",
    heating_type: "gas boiler",
    cooling: false,
    internet_available: true,
    parking: "street (free) + bike storage",
    building_year: 1965,
    building_floors: 3,
    view_type: "garden view",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-10-15",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "families or pet owners",
    image_urls: [
      "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
    ]
  },

  // 8. Affordable IX. kerület
  {
    title: "Budget 2-room Flat for Roommates - Corvin",
    description: "Great value 50 m² apartment near Corvin negyed metro (M3). 2 separate bedrooms, shared living area, kitchen, bathroom. Partially furnished - beds, wardrobes, kitchen basics. Panel building with elevator, 8th floor with nice view. Central heating included in common cost (15000 Ft). Perfect for 2 students or young professionals to share. Near Corvin Plaza shopping center, easy commute to universities. Internet available (tenant arranges contract). Building has shared laundry room. 6 months minimum, 2 months deposit. Students welcome. Available immediately.",
    price_huf: 225000,
    district: 9,
    address: "Práter utca 35, IX. kerület, Budapest",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 50,
    floor_number: 8,
    furnishing: "partially_furnished",
    elevator: "yes",
    latitude: 47.4822,
    longitude: 19.0811,
    is_available: true,
    common_cost: 15000,
    utilities_estimate: "12000-18000 Ft/month",
    property_type: "panel flat",
    condition: "good",
    heating_type: "central heating (távfűtés)",
    cooling: false,
    internet_available: true,
    parking: "street (free)",
    building_year: 1980,
    building_floors: 10,
    view_type: "city view",
    minimum_lease: "6 months",
    deposit_months: 2,
    available_from: "immediately",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "students or young professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]
  },

  // 9. Historic I. kerület
  {
    title: "Charming Studio in Buda Castle District - Várnegyed",
    description: "Beautiful 35 m² studio apartment in UNESCO World Heritage Castle District. Original features preserved - high ceilings, wooden beams, stone walls. Fully renovated with modern comfort. Courtyard-facing, very quiet. Fully furnished with antique-style furniture. Gas heating, no AC (but cool in summer). No elevator but only 2nd floor. Perfect for someone who appreciates history and architecture. Tourist area but peaceful residential building. Walking distance to Matthias Church, Fisherman's Bastion. 12 months lease, 2 months deposit. Professional tenant preferred. Available November 1.",
    price_huf: 265000,
    district: 1,
    address: "Tárnok utca 14, I. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 35,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4979,
    longitude: 19.0347,
    is_available: true,
    common_cost: 16000,
    utilities_estimate: "15000-22000 Ft/month",
    property_type: "historic building",
    condition: "renovated",
    heating_type: "gas boiler",
    cooling: false,
    internet_available: true,
    parking: "street (paid zone)",
    building_year: 1780,
    building_floors: 3,
    view_type: "courtyard",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-11-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"
    ]
  },

  // 10. Modern XIV. kerület
  {
    title: "New 2-room Apartment in Green Area - Zugló",
    description: "Brand new 52 m² apartment in modern residential complex (built 2024). 1 bedroom + living room, open kitchen, modern bathroom. Floor heating, AC, underground parking included. Building has gym, community garden, bike storage. Near City Park, Heroes' Square, metro M1. Quiet residential area with excellent schools, shops. Fully furnished with IKEA furniture. Common cost includes water, heating, maintenance. Perfect for families or couples. Pet-friendly building - small dogs welcome. 12 months minimum, 2 months deposit. References required. Available December 15.",
    price_huf: 335000,
    district: 14,
    address: "Ajtósi Dürer sor 15, XIV. kerület, Budapest",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 52,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.5178,
    longitude: 19.0856,
    is_available: true,
    common_cost: 28000,
    utilities_estimate: "20000-30000 Ft/month",
    property_type: "new development",
    condition: "newly built",
    heating_type: "floor heating + central",
    cooling: true,
    internet_available: true,
    parking: "underground garage included",
    building_year: 2024,
    building_floors: 5,
    view_type: "park view",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-12-15",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "families or couples",
    image_urls: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    ]
  },

  // 11. Student XII. kerület
  {
    title: "Affordable Room in Shared Flat - Böszörményi út",
    description: "Private 12 m² room in 3-bedroom shared apartment, perfect for students. Shared kitchen, bathroom, living room with 2 other students. Your room has bed, desk, wardrobe, lock on door. Building near Déli station, tram 59/61. Easy access to BME, ELTE. Central heating included. Washing machine available. Quiet residential Buda area. Current flatmates are engineering students (ages 22-24), looking for similar person. No parties, non-smoking. Flexible 3-6-12 month lease. 1 month deposit. Available immediately. Students only.",
    price_huf: 135000,
    district: 12,
    address: "Böszörményi út 22, XII. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 70,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4889,
    longitude: 19.0233,
    is_available: true,
    common_cost: 20000,
    utilities_estimate: "divided by 3 (~8000 Ft/person)",
    property_type: "panel flat",
    condition: "good",
    heating_type: "central heating (távfűtés)",
    cooling: false,
    internet_available: true,
    parking: "street (free)",
    building_year: 1978,
    building_floors: 10,
    view_type: "courtyard",
    minimum_lease: "3 months",
    deposit_months: 1,
    available_from: "immediately",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "students only",
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 12. Luxury II. kerület
  {
    title: "Luxurious 3-room Villa Apartment - Rózsadomb",
    description: "Exclusive 110 m² apartment in prestigious Rózsadomb area. 2 bedrooms + study room, 2 bathrooms, large terrace (20 m²) with Danube view. Part of luxury villa, only 4 units. High-end finishes throughout - marble floors, designer kitchen (Miele appliances), smart home system. Floor heating, AC, alarm system. Private garage + guest parking. Garden access. Ultimate quiet and privacy. Perfect for diplomats, executives, VIP clients. Common cost includes all utilities, security, garden maintenance. 24-month lease preferred, 3 months deposit. References required. Available January 1, 2026.",
    price_huf: 785000,
    district: 2,
    address: "Törökvész út 45, II. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 2,
    kitchen: 1,
    balcony: 1,
    size_sqm: 110,
    floor_number: 1,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.5289,
    longitude: 19.0178,
    is_available: true,
    common_cost: 65000,
    utilities_estimate: "included in common cost",
    property_type: "luxury villa",
    condition: "newly built",
    heating_type: "floor heating + central",
    cooling: true,
    internet_available: true,
    parking: "private garage + guest spots",
    building_year: 2021,
    building_floors: 2,
    view_type: "Danube panorama",
    minimum_lease: "24 months",
    deposit_months: 3,
    available_from: "2026-01-01",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "executives or diplomats",
    image_urls: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
    ]
  },

  // 13. Semmelweis area VIII
  {
    title: "Medical Student Studio - Üllői út Clinic Area",
    description: "Practical 30 m² studio apartment 3 min walk from Semmelweis University clinics. Perfect for medical students with long hospital hours. Furnished with murphy bed (saves space), desk, wardrobe, kitchenette. Recently renovated, clean, bright. Electric panel heating (can control temperature). Building has elevator, washing machines in basement. Quiet courtyard view. Landlord is retired doctor, understands medical student needs. Flexible lease 6-12 months. 1.5 months deposit. Internet ready. No smoking, no pets. Medical students preferred. Available October 1.",
    price_huf: 155000,
    district: 8,
    address: "Üllői út 92, VIII. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 30,
    floor_number: 5,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4789,
    longitude: 19.0778,
    is_available: true,
    common_cost: 14000,
    utilities_estimate: "10000-15000 Ft/month",
    property_type: "brick apartment",
    condition: "renovated",
    heating_type: "electric panel heating",
    cooling: false,
    internet_available: true,
    parking: "street (free)",
    building_year: 1955,
    building_floors: 6,
    view_type: "courtyard",
    minimum_lease: "6 months",
    deposit_months: 1.5,
    available_from: "2025-10-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "medical students",
    image_urls: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"
    ]
  },

  // 14. Riverside IX
  {
    title: "Riverside 2-room Apartment - Boráros tér",
    description: "Beautiful 58 m² apartment with partial Danube view near Boráros tér. 1 bedroom + living room, separate kitchen, renovated bathroom. Large balcony (8 m²) facing river. Brick building from 1920s, recently renovated. Fully furnished, modern style. Gas heating, AC in living room. Walking distance to ELTE, Corvinus University, Bálna cultural center. Tram 2 (scenic riverside line) at doorstep. Elevator works. Quiet despite central location. Perfect for professionals or graduate students. 12 months lease, 2 months deposit. No pets. Available November 15.",
    price_huf: 325000,
    district: 9,
    address: "Lónyay utca 8, IX. kerület, Budapest",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 58,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4822,
    longitude: 19.0611,
    is_available: true,
    common_cost: 22000,
    utilities_estimate: "20000-28000 Ft/month",
    property_type: "brick apartment",
    condition: "renovated",
    heating_type: "gas combi boiler",
    cooling: true,
    internet_available: true,
    parking: "street (paid zone)",
    building_year: 1925,
    building_floors: 5,
    view_type: "partial Danube view",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-11-15",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "professionals or grad students",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800"
    ]
  },

  // 15. Creative space XI
  {
    title: "Artist's Loft with High Ceilings - Mester utca",
    description: "Unique 62 m² loft apartment perfect for creative professionals. 4-meter high ceilings, huge south-facing windows, incredible natural light. Open-plan living/studio space + sleeping loft + bathroom. Industrial-chic renovation in former textile factory. Gas heating, exposed brick, wooden beams. Partially furnished (can accommodate workspace). Fast fiber internet included. Ground floor with separate entrance, great for artists, designers, photographers. Quiet courtyard, bike-friendly. Near metro M4 (Kálvin tér), tram 4/6. Pet-friendly landlord. 12 months lease, 2 months deposit. Creative professionals preferred. Available December 1.",
    price_huf: 285000,
    district: 9,
    address: "Mester utca 34, IX. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 62,
    floor_number: 0,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4789,
    longitude: 19.0856,
    is_available: true,
    common_cost: 18000,
    utilities_estimate: "20000-30000 Ft/month",
    property_type: "converted factory",
    condition: "renovated",
    heating_type: "gas boiler",
    cooling: false,
    internet_available: true,
    parking: "courtyard (free)",
    building_year: 1910,
    building_floors: 1,
    view_type: "courtyard + huge windows",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "2025-12-01",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "creative professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
    ]
  },

  // Continue with more diverse listings...
  // 16-30: Adding 15 more diverse apartments

  // 16. Budget III. kerület
  {
    title: "Simple 1-room Flat in Óbuda - Near HÉV",
    description: "Affordable 35 m² apartment in quiet Óbuda neighborhood. 1 room + kitchen + bathroom. Basic furnishing (bed, table, wardrobe). Panel building with elevator. Central heating included in common cost. Near HÉV (suburban rail) to city center. Good for single person or student who wants calm residential area. Safe neighborhood, grocery stores nearby. Elderly landlord prefers quiet, responsible tenant. 12 months lease, 1.5 months deposit. No pets, no smoking. Internet available. Available immediately.",
    price_huf: 165000,
    district: 3,
    address: "Szentendrei út 105, III. kerület, Budapest",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 35,
    floor_number: 6,
    furnishing: "partially_furnished",
    elevator: "yes",
    latitude: 47.5467,
    longitude: 19.0456,
    is_available: true,
    common_cost: 16000,
    utilities_estimate: "12000-18000 Ft/month",
    property_type: "panel flat",
    condition: "needs refresh",
    heating_type: "central heating (távfűtés)",
    cooling: false,
    internet_available: true,
    parking: "street (free)",
    building_year: 1982,
    building_floors: 11,
    view_type: "city view",
    minimum_lease: "12 months",
    deposit_months: 1.5,
    available_from: "immediately",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "quiet professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 17. Shared flat for internationals
  {
    title: "International Shared Apartment - Oktogon Area",
    description: "Friendly 4-bedroom apartment with 1 room available (14 m²). Current flatmates from Spain, Germany, Hungary (ages 23-27), working/studying. Your private room furnished: bed, desk, wardrobe, shelf. Shared kitchen (fully equipped), 2 bathrooms, living room. Central location - metro M1 Oktogon, tram 4/6. Common cost includes water, heating. We cook together sometimes, movie nights, explore city on weekends. English-speaking household. Perfect for Erasmus or expats new to Budapest. Flexible 3-12 months lease. 1 month deposit. Available November 1. International students/workers welcome!",
    price_huf: 185000,
    district: 6,
    address: "Nagymező utca 18, VI. kerület, Budapest",
    bedrooms: 4,
    bathrooms: 2,
    kitchen: 1,
    balcony: 1,
    size_sqm: 95,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.5033,
    longitude: 19.0633,
    is_available: true,
    common_cost: 28000,
    utilities_estimate: "divided by 4 (~10000 Ft/person)",
    property_type: "brick apartment",
    condition: "good",
    heating_type: "central heating",
    cooling: false,
    internet_available: true,
    parking: "street (paid zone)",
    building_year: 1900,
    building_floors: 3,
    view_type: "street-facing",
    minimum_lease: "3 months",
    deposit_months: 1,
    available_from: "2025-11-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "international students/young professionals",
    image_urls: [
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800"
    ]
  },

  // 18. Family-friendly XI
  {
    title: "3-room Garden Apartment - Allee Shopping Center",
    description: "Spacious 72 m² ground floor apartment with 40 m² private garden! Perfect for families with children. 2 bedrooms + living room, separate kitchen, bathroom with bathtub. Partially furnished (can add/remove furniture). Garden has playground equipment, gardening space. Safe residential area with parks, schools, pediatrician nearby. Near Allee shopping mall, metro M4 (Kelenföld). Gas heating, washing machine included. Building has bike storage, stroller parking. Pet-friendly - dogs welcome! Children-friendly landlord. 12-24 months lease, 2 months deposit. Available immediately.",
    price_huf: 345000,
    district: 11,
    address: "Kosztolányi Dezső tér 8, XI. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 72,
    floor_number: 0,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4667,
    longitude: 19.0456,
    is_available: true,
    common_cost: 24000,
    utilities_estimate: "25000-35000 Ft/month",
    property_type: "brick apartment",
    condition: "good",
    heating_type: "gas boiler",
    cooling: false,
    internet_available: true,
    parking: "courtyard (free) + street",
    building_year: 1970,
    building_floors: 3,
    view_type: "garden view",
    minimum_lease: "12 months",
    deposit_months: 2,
    available_from: "immediately",
    pets_allowed: true,
    smoking_allowed: false,
    preferred_tenants: "families with children",
    image_urls: [
      "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?w=800"
    ]
  },

  // 19. Premium V. kerület
  {
    title: "Historic 3-room Apartment - Vörösmarty tér",
    description: "Elegant 78 m² apartment in the absolute heart of Budapest. Original Art Nouveau details preserved - stucco ceilings, parquet floors, French doors. 2 bedrooms + salon, high-end bathroom, modern kitchen. Fully furnished with antique and design furniture. Building from 1890, beautifully maintained. Street-facing Vörösmarty tér - yes, tourist area but double-glazed windows + thick walls = very quiet inside. AC, gas heating. Walking distance to everything - Danube, shopping, restaurants. Perfect for executives or culture lovers. 12 months minimum, 3 months deposit. References required. No pets. Available December 1.",
    price_huf: 625000,
    district: 5,
    address: "Vörösmarty tér 2, V. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 78,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4961,
    longitude: 19.0517,
    is_available: true,
    common_cost: 35000,
    utilities_estimate: "30000-45000 Ft/month",
    property_type: "historic building",
    condition: "renovated",
    heating_type: "gas central heating",
    cooling: true,
    internet_available: true,
    parking: "garage nearby (extra fee)",
    building_year: 1895,
    building_floors: 4,
    view_type: "square view",
    minimum_lease: "12 months",
    deposit_months: 3,
    available_from: "2025-12-01",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "executives",
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
    ]
  },

  // 20. Student-friendly VIII
  {
    title: "Clean Shared Room for Female Students - Blaha Area",
    description: "Private 11 m² room in 3-bedroom female-only apartment. Current tenants: 2 ELTE students (psychology, economics). Room has bed, desk, wardrobe, personal lock. Shared kitchen, bathroom (recently renovated). Central heating, washing machine, WiFi. Near Blaha Lujza metro (M2), 5 min to ELTE. Building clean, safe, has elevator. Perfect for Muslim students or anyone preferring female-only housing. Quiet study environment, everyone respectful. Flexible 3-6-12 months. 1 month deposit. Common cost + utilities split 3 ways (~18000 Ft/person). Available October 15. Female students only.",
    price_huf: 145000,
    district: 8,
    address: "Rákóczi út 32, VIII. kerület, Budapest",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 62,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4956,
    longitude: 19.0744,
    is_available: true,
    common_cost: 18000,
    utilities_estimate: "divided by 3 (~18000 Ft total/person)",
    property_type: "brick apartment",
    condition: "renovated",
    heating_type: "central heating",
    cooling: false,
    internet_available: true,
    parking: "street (paid zone)",
    building_year: 1930,
    building_floors: 5,
    view_type: "courtyard",
    minimum_lease: "3 months",
    deposit_months: 1,
    available_from: "2025-10-15",
    pets_allowed: false,
    smoking_allowed: false,
    preferred_tenants: "female students only",
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ]
  }

  // Total: 20 comprehensive apartments with full realistic details
  // You can add 30-80 more following the same pattern for complete dataset
];

async function seedComprehensive() {
  console.log('🌱 Starting comprehensive apartment database seeding...');
  
  try {
    // Clear existing data
    console.log('🗑️  Clearing existing apartments...');
    const { error: deleteError } = await supabase
      .from('apartments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      console.error('Error clearing:', deleteError);
    }

    // Insert comprehensive apartments
    console.log('📥 Inserting comprehensive apartments...');
    const { data, error } = await supabase
      .from('apartments')
      .insert(comprehensiveApartments)
      .select();

    if (error) {
      console.error('❌ Error inserting apartments:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} comprehensive apartments!`);
    console.log('\n📊 Database Summary:');
    console.log(`   - Price range: ${Math.min(...comprehensiveApartments.map(a => a.price_huf)).toLocaleString()} - ${Math.max(...comprehensiveApartments.map(a => a.price_huf)).toLocaleString()} HUF/month`);
    
    const districts = Array.from(new Set(comprehensiveApartments.map(a => a.district))).sort((a, b) => a - b);
    console.log(`   - Districts: ${districts.join(', ')}`);
    console.log(`   - Total sqm: ${comprehensiveApartments.reduce((sum, a) => sum + (a.size_sqm || 0), 0)} m²`);
    console.log(`   - Furnished: ${comprehensiveApartments.filter(a => a.furnishing === 'furnished').length}`);
    console.log(`   - Pet-friendly: ${comprehensiveApartments.filter(a => a.pets_allowed).length}`);
    console.log(`   - With elevator: ${comprehensiveApartments.filter(a => a.elevator === 'yes').length}`);
    console.log(`   - With AC: ${comprehensiveApartments.filter(a => a.cooling).length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

seedComprehensive()
  .then(() => {
    console.log('\n✨ Comprehensive seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
