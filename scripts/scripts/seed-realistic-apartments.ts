// FILE: scripts/seed-realistic-apartments.ts
// Realistic apartment data for Budapest student housing
// Run: npx tsx scripts/seed-realistic-apartments.ts

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const realisticApartments = [
  // 1. Budget-friendly near ELTE & Semmelweis
  {
    title: "Quiet Studio Near ELTE - Perfect for Focused Students",
    description: "Peaceful 35m² studio apartment ideal for psychology or medical students who need to study late. Located between Astoria and Kálvin tér, 10 min walk to ELTE PPK. Fully furnished with desk, comfortable bed, and kitchenette. Heating included in price. Building has elevator. Quiet neighbors, no parties. Female tenants preferred. Non-smoking. Available immediately.",
    price_huf: 165000,
    district: 8,
    address: "Múzeum körút 15, Budapest, District VIII",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 35,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4919,
    longitude: 19.0631,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"
    ]
  },

  // 2. Two-room for friends near both universities
  {
    title: "Cozy 2-Room Between ELTE & BME - Ideal for Students",
    description: "Perfect location for students from different universities! 52m² apartment near Kálvin tér - 15 min by tram to both ELTE and BME. Two separate bedrooms, shared living area with kitchenette. Fully furnished, heating and hot water included. Washing machine in building. Tram 4/6 at doorstep. Clean, maintained building. Looking for responsible, quiet tenants. Max 2 people. Available from September.",
    price_huf: 275000,
    district: 9,
    address: "Üllői út 12, Budapest, District IX",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 52,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4866,
    longitude: 19.0622,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]
  },

  // 3. Bright studio for Erasmus students
  {
    title: "Bright Furnished Studio - Ready for Erasmus Students",
    description: "Clean, modern 32m² studio perfect for international students. Fully equipped: bed, desk, wardrobe, kitchenette with fridge and stove, private bathroom. Large windows with lots of natural light. Fast WiFi included. 5 min walk to metro M3 (Corvin-negyed), easy access to universities and city center. Building has washing machines. Quiet, safe neighborhood with grocery stores nearby. Short or long-term rental available. Ready to move in!",
    price_huf: 170000,
    district: 8,
    address: "Corvin köz 3, Budapest, District VIII",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 32,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4844,
    longitude: 19.0722,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 4. Shared flat near Semmelweis
  {
    title: "Shared Flat for Medical Students - Private Rooms",
    description: "45m² apartment with 2 private rooms available for medical students near Semmelweis University. Each room has lock, bed, desk, closet. Shared kitchen and bathroom. Perfect for students with long study hours who need a quiet, clean environment. Current tenant is also a medical student. Heating, water, WiFi included. No smoking, no pets. Looking for responsible, tidy flatmate. Female preferred. 5 min walk to university clinics.",
    price_huf: 140000,
    district: 8,
    address: "Üllői út 78, Budapest, District VIII",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 45,
    floor_number: 1,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4789,
    longitude: 19.0778,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
    ]
  },

  // 5. Creative studio with character
  {
    title: "Inspiring Studio with Big Windows - Perfect for Artists",
    description: "Unique 40m² studio apartment with high ceilings and huge windows facing south - amazing natural light all day! Perfect for design, art, or media students from MOME. Spacious room to store materials or set up workspace. Hardwood floors, plants-friendly. Quiet residential building in District XI, 20 min to MOME campus by tram. Furnished with basics (bed, table, storage). Pet-friendly landlord. Bohemian, creative atmosphere. Available now.",
    price_huf: 158000,
    district: 11,
    address: "Bartók Béla út 29, Budapest, District XI",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 40,
    floor_number: 5,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4756,
    longitude: 19.0567,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
    ]
  },

  // 6. Modern flat for PhD researcher
  {
    title: "Modern Studio Near City Center - Perfect for Researchers",
    description: "Renovated 38m² studio in quiet District V street, 15 min walk to CEU and downtown. Excellent for PhD students or researchers. Large desk area with great natural lighting, ergonomic chair included. Fast fiber internet (300 Mbps). Modern kitchen, new bathroom. Air conditioning for summer. Building has elevator and is very quiet. Heating, water, WiFi included. Non-smoking building. Long-term tenant preferred (1-2 years). Professional, clean, organized living.",
    price_huf: 245000,
    district: 5,
    address: "Hold utca 8, Budapest, District V",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 38,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.5019,
    longitude: 19.0511,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
    ]
  },

  // 7. Pet-friendly for remote workers
  {
    title: "Modern Pet-Friendly Apartment - Great for Remote Work",
    description: "Beautiful 48m² renovated apartment perfect for remote workers or digital nomads. Near Corvin metro - excellent connections everywhere. High-speed fiber WiFi (500 Mbps), dedicated workspace area. Modern kitchen with dishwasher, washing machine in apartment. Pet-friendly building - small cats/dogs welcome! Air conditioning, good heating. Furnished: bed, sofa, desk, storage. Quiet neighbors. Available for 3-12 month contracts. Move in immediately. Utilities ~30k/month extra.",
    price_huf: 275000,
    district: 8,
    address: "József körút 45, Budapest, District VIII",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 48,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4911,
    longitude: 19.0689,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800"
    ]
  },

  // 8. Female-only shared flat
  {
    title: "Female-Only Shared Flat Near Metro - Clean & Safe",
    description: "Looking for one female flatmate! 2-bedroom apartment, you get private room with lock (14m²), bed, desk, wardrobe. Shared kitchen, bathroom, living area. Current tenant is clean, organized ELTE student. Non-smoking apartment. Located 3 min from Blaha Lujza metro (M2), 10 min to ELTE. Quiet building, safe neighborhood. Heating, water included. WiFi available. We cook together sometimes but respect privacy. Looking for tidy, respectful person. Available from October 1st.",
    price_huf: 155000,
    district: 8,
    address: "Rákóczi út 18, Budapest, District VIII",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 55,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4956,
    longitude: 19.0744,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ]
  },

  // 9. Affordable for budget students
  {
    title: "Budget-Friendly Room Near BME - Scholarship Students Welcome",
    description: "Simple but clean private room in shared apartment, perfect for students with limited budget (Stipendium Hungaricum, etc.). 12m² room with bed, desk, small closet. Shared kitchen, bathroom with 2 other students. Located 10 min walk to BME. Heating, water, WiFi included in price. Building is older but maintained. Safe area with grocery store, pharmacy nearby. Metro M4 (10 min walk) or tram 4/6. Long-term rental preferred. Calm, respectful flatmates needed.",
    price_huf: 125000,
    district: 11,
    address: "Műegyetem rakpart 9, Budapest, District XI",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 65,
    floor_number: 1,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4801,
    longitude: 19.0611,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 10. Couple-friendly apartment
  {
    title: "1-Bedroom for Couple - Near Metro & Universities",
    description: "Perfect for young couples! Modern 42m² apartment with separate bedroom, living room with sofa, full kitchen, renovated bathroom. Near Kálvin tér - easy access to ELTE, BME, and city center. Washing machine in apartment, heating included. Fast WiFi, good for home office. Building has elevator, quiet neighbors. Furnished: bed, wardrobe, table, chairs, sofa, kitchen appliances. Pet-friendly. Long-term rental preferred (1+ year). Move in with 2 months deposit.",
    price_huf: 290000,
    district: 9,
    address: "Ráday utca 15, Budapest, District IX",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 42,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4889,
    longitude: 19.0633,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"
    ]
  },

  // 11. Social flat for making friends
  {
    title: "Friendly Shared Flat - Meet International Students!",
    description: "Fun, social shared apartment with 3 bedrooms - 1 room available now! Current flatmates are international students (Spain, Germany). We enjoy cooking together, movie nights, exploring Budapest on weekends. Your private room (13m²) has bed, desk, wardrobe. Shared kitchen, bathroom, living room. Near Oktogon (metro M1), 5 min to city center. Perfect for Erasmus students or anyone new to Budapest wanting to make friends. Party occasionally but respect quiet hours. English-speaking. Available immediately!",
    price_huf: 175000,
    district: 6,
    address: "Andrássy út 55, Budapest, District VI",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 72,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.5044,
    longitude: 19.0711,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800",
      "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800"
    ]
  },

  // 12. Studio for culinary students
  {
    title: "Studio with Full Kitchen - Perfect for Culinary Students",
    description: "Spacious 36m² studio with unusually large, fully-equipped kitchen! Perfect for culinary arts students. Kitchen has: full-size fridge, 4-burner stove, oven, lots of counter space, storage for ingredients. Located near Corvin Plaza (shopping, metro). Furnished with bed, table, wardrobe. Building has elevator. Heating and water included. Quiet building, friendly neighbors. Landlord understands culinary students cook a lot - no problem! Available now. 1-month deposit.",
    price_huf: 162000,
    district: 9,
    address: "Ferenc körút 22, Budapest, District IX",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 36,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4822,
    longitude: 19.0811,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800"
    ]
  },

  // 13. Two friends from different universities
  {
    title: "2-Bedroom Near Kálvin - BME & ELTE Students",
    description: "Ideal for 2 friends studying at different universities! Located exactly between BME and ELTE (Kálvin tér area). 2 equal-sized bedrooms (12m² each), shared living/dining area, full kitchen, renovated bathroom. Tram 4/6 stops in front of building - 15 min to both universities. Fully furnished, heating included, WiFi ready. Clean building with elevator. Perfect for architecture and psychology students, engineers and humanities, etc. Quiet but social. Looking for responsible tenants. Long-term preferred.",
    price_huf: 285000,
    district: 9,
    address: "Kinizsi utca 10, Budapest, District IX",
    bedrooms: 2,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 58,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4833,
    longitude: 19.0644,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800"
    ]
  },

  // 14. Engineering student near Danube
  {
    title: "Studio Walking Distance to BME - River View",
    description: "Beautiful studio apartment for engineering students, just 10 min walk to BME! 34m² with partial Danube view from window. Excellent WiFi (perfect for CAD projects, online lectures). Furnished with bed, large desk, ergonomic chair, wardrobe, kitchen corner. Modern bathroom. Quiet building, mostly students and young professionals. Heating, water included. Washing machine in building. Safe area, grocery stores nearby. Female tenant preferred but not required. Available from September 15.",
    price_huf: 188000,
    district: 11,
    address: "Bertalan Lajos utca 8, Budapest, District XI",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 34,
    floor_number: 4,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4778,
    longitude: 19.0556,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800"
    ]
  },

  // 15. Furnished for newcomers
  {
    title: "Fully Furnished Shared Flat - Perfect for Newcomers",
    description: "Great for students new to Budapest! Shared 3-bedroom apartment with 1 room available (14m²). Everything included: bed, desk, wardrobe, kitchen appliances, plates/utensils, bedding, towels. Just bring your suitcase! Current flatmates are friendly master's students (ages 22-26), English speakers. We occasionally have dinners or watch movies together. Near Astoria metro - 5 min to center, easy access to all universities. Building has elevator. Heating, water, WiFi included. Looking for social but responsible person.",
    price_huf: 178000,
    district: 7,
    address: "Dohány utca 42, Budapest, District VII",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 68,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4978,
    longitude: 19.0644,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800"
    ]
  },

  // 16. Ultra-budget international student
  {
    title: "Affordable Room for Scholarship Students - Under 130k!",
    description: "Budget-friendly option for international students with limited funds. Private room (10m²) in shared 4-bedroom apartment. Basic furnishing: bed, small desk, shelf. Shared kitchen, bathroom with 3 other scholarship students from Egypt, Jordan, Nigeria. Everyone is respectful, clean, quiet. Located near metro M3 (Nagyvárad tér) - 15 min to BME, 20 min to city center. Heating, water included in price. Building is older but safe area. Grocery stores, markets nearby. Perfect for IT, engineering, or any scholarship student needing affordable housing.",
    price_huf: 118000,
    district: 9,
    address: "Üllői út 145, Budapest, District IX",
    bedrooms: 4,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 75,
    floor_number: 1,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4744,
    longitude: 19.0933,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },

  // 17. Muslim female student housing
  {
    title: "Female-Only Room with Privacy - Muslim-Friendly",
    description: "Private room for female student in clean, respectful shared apartment. Your room (13m²) has proper door lock, bed, desk, wardrobe. Current flatmates are also female students (non-smokers). Kitchen and bathroom shared but very clean, organized. Near ELTE (District VIII), 10 min walk to campus. Good heating, hot water always available. Building is safe, quiet. Perfect for Muslim students or anyone preferring female-only housing. Privacy respected. Halal grocery stores nearby. Available immediately. 1-month deposit required.",
    price_huf: 158000,
    district: 8,
    address: "Bródy Sándor utca 12, Budapest, District VIII",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 62,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4933,
    longitude: 19.0667,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"
    ]
  },

  // 18. Internship studio
  {
    title: "Furnished Studio for Interns - Flexible Rental",
    description: "Perfect for 3-6 month internships! Fully furnished 30m² studio near Astoria, walking distance to ELTE PPK. Everything included: bed, desk, small kitchen (fridge, stove), private bathroom, WiFi, heating, water. Very comfortable, quiet apartment in well-maintained building. Ideal for psychology interns or similar. Short-term contracts accepted (minimum 3 months). Available immediately or reserve for later. Professional, clean environment. No smoking. Utilities included in rent. Move in ready!",
    price_huf: 225000,
    district: 5,
    address: "Károlyi utca 8, Budapest, District V",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 30,
    floor_number: 3,
    furnishing: "furnished",
    elevator: "yes",
    latitude: 47.4944,
    longitude: 19.0589,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800"
    ]
  },

  // 19. Creative bright studio for freelancers
  {
    title: "Bright Studio for Creative Freelancers - Natural Light",
    description: "Amazing studio for illustrators, designers, photographers! 44m² with huge windows facing east and south - incredible natural light all day. Perfect for art videos, drawing, creative work. High ceilings, white walls (you can hang your work). Fast fiber WiFi (500 Mbps). Spacious room to work and store materials. Small balcony with plants. Pet-friendly landlord - small rabbit/cat OK! Located in quiet residential area (District XI), 15 min tram to city center. Furnished basics. Utilities ~35k extra/month. Available now!",
    price_huf: 248000,
    district: 11,
    address: "Karinthy Frigyes út 18, Budapest, District XI",
    bedrooms: 1,
    bathrooms: 1,
    kitchen: 1,
    balcony: 1,
    size_sqm: 44,
    floor_number: 5,
    furnishing: "partially_furnished",
    elevator: "no",
    latitude: 47.4722,
    longitude: 19.0511,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"
    ]
  },

  // 20. Local Hungarian student
  {
    title: "Small Room Near BME - Local & International Students",
    description: "Cozy private room (11m²) in shared apartment, perfect for students from outside Budapest (Debrecen, Szeged, etc.) or international students. Shared with 2 other BME students. Very quiet, clean apartment - everyone studies hard and works part-time. Your room has bed, desk, small wardrobe. Kitchen, bathroom shared. Located 8 min walk to BME campus. Tram 4/6 nearby. Non-smoking apartment, no drinking/parties. Respectful, calm atmosphere. Heating, WiFi included. Looking for similar person: quiet, clean, responsible. Available immediately.",
    price_huf: 148000,
    district: 11,
    address: "Stoczek utca 5, Budapest, District XI",
    bedrooms: 3,
    bathrooms: 1,
    kitchen: 1,
    balcony: 0,
    size_sqm: 60,
    floor_number: 2,
    furnishing: "furnished",
    elevator: "no",
    latitude: 47.4767,
    longitude: 19.0589,
    is_available: true,
    image_urls: [
      "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800"
    ]
  },
];

async function seedDatabase() {
  console.log('🌱 Starting to seed realistic apartment data...');
  
  try {
    // First, create or get a demo owner user
    console.log('👤 Setting up demo owner...');
    const demoEmail = 'demo-owner@studentapartments.com';
    const demoPassword = 'Demo123456!';
    
    // Try to sign up the demo owner (will fail if exists, which is fine)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: demoEmail,
      password: demoPassword,
    });
    
    // Get the user ID (either from signup or by signing in)
    let ownerId: string;
    
    if (signUpError && signUpError.message.includes('already registered')) {
      // User exists, sign in to get ID
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });
      
      if (signInError || !signInData.user) {
        console.error('❌ Could not authenticate demo owner:', signInError);
        throw new Error('Failed to get demo owner ID');
      }
      
      ownerId = signInData.user.id;
      console.log('✅ Using existing demo owner:', ownerId);
    } else if (signUpData.user) {
      ownerId = signUpData.user.id;
      console.log('✅ Created new demo owner:', ownerId);
    } else {
      throw new Error('Failed to create or get demo owner');
    }
    
    // Add owner_id to all apartments
    const apartmentsWithOwner = realisticApartments.map(apt => ({
      ...apt,
      owner_id: ownerId,
      status: 'published' // Make them visible publicly
    }));
    
    // Delete existing apartments
    console.log('🗑️  Clearing existing apartments...');
    const { error: deleteError } = await supabase
      .from('apartments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      console.error('Error clearing apartments:', deleteError);
    }

    // Insert new apartments
    console.log('📥 Inserting realistic apartments...');
    const { data, error } = await supabase
      .from('apartments')
      .insert(apartmentsWithOwner)
      .select();

    if (error) {
      console.error('❌ Error inserting apartments:', error);
      throw error;
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} apartments!`);
    console.log('\n📊 Summary:');
    console.log(`   - Budget range: ${Math.min(...realisticApartments.map(a => a.price_huf)).toLocaleString()} - ${Math.max(...realisticApartments.map(a => a.price_huf)).toLocaleString()} HUF`);
    const districts = Array.from(new Set(realisticApartments.map(a => a.district))).sort();
    console.log(`   - Districts covered: ${districts.join(', ')}`);
    console.log(`   - Total bedrooms available: ${realisticApartments.reduce((sum, a) => sum + a.bedrooms, 0)}`);
    console.log('\n🎓 Apartment types:');
    console.log('   - Studios: ' + realisticApartments.filter(a => a.bedrooms === 1).length);
    console.log('   - 2-bedroom: ' + realisticApartments.filter(a => a.bedrooms === 2).length);
    console.log('   - Shared (3+ rooms): ' + realisticApartments.filter(a => a.bedrooms >= 3).length);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('\n✨ Database seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
