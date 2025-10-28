// Script to seed additional apartments with various price points
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const additionalApartments = [
  {
    title: 'Budget Studio for Students - Clean & Simple',
    description: 'Perfect for students on a budget. Clean, simple studio with everything you need. Close to public transport, quiet neighborhood, ideal for studying.',
    price_huf: 120000,
    address: 'Üllői út 82, Budapest',
    latitude: 47.477199,
    longitude: 19.080300,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 28,
    district: 8,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800',
    ],
  },
  {
    title: 'Affordable 2-Bedroom Near Metro - Student Flatshare',
    description: 'Great value 2-bedroom apartment near metro. Perfect for flatsharing students. Stable internet, washing machine included. Landlord speaks English.',
    price_huf: 145000,
    address: 'Kőbányai út 45, Budapest',
    latitude: 47.488800,
    longitude: 19.104200,
    bedrooms: 2,
    bathrooms: 1,
    size_sqm: 52,
    district: 10,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800',
    ],
  },
  {
    title: 'Cozy 1BR with Wifi - Budget Conscious Students',
    description: 'Cozy one-bedroom with excellent wifi connection. Perfect for students working from home. Close to universities, affordable lease terms.',
    price_huf: 125000,
    address: 'Thököly út 88, Budapest',
    latitude: 47.505600,
    longitude: 19.091100,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 32,
    district: 14,
    deposit_months: 1,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1560185127-6a7e5a4f5a0f?w=800',
    ],
  },
  {
    title: 'Modern Studio with Kitchen - Budget Friendly',
    description: 'Modern studio apartment with fully equipped kitchen. Stable wifi, workspace available. Great for students on tight budget. Quiet study environment.',
    price_huf: 128000,
    address: 'Nagytétényi út 22, Budapest',
    latitude: 47.395200,
    longitude: 19.010400,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 30,
    district: 22,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    ],
  },
  {
    title: 'Shared Room in 3BR - Very Affordable',
    description: 'Shared room in nice 3-bedroom apartment. Perfect for students on minimal budget. Workspace, wifi, lease flexibility. Good roommates.',
    price_huf: 122000,
    address: 'Fehérvári út 102, Budapest',
    latitude: 47.462500,
    longitude: 19.036700,
    bedrooms: 3,
    bathrooms: 2,
    size_sqm: 75,
    district: 11,
    deposit_months: 1,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800',
    ],
  },
  {
    title: 'Bright Studio - Budget Price, Quality Living',
    description: 'Bright, sunny studio at budget price. Quiet study space, stable wifi, washing machine. Perfect for scholarship students. Landlord flexible with lease terms.',
    price_huf: 135000,
    address: 'Váci út 178, Budapest',
    latitude: 47.540100,
    longitude: 19.072800,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 34,
    district: 13,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
      'https://images.unsplash.com/photo-1560185127-a00a6e9e8af5?w=800',
    ],
  },
  {
    title: 'Economic 2BR for Student Couple - Affordable',
    description: 'Economic 2-bedroom for student couples. Budget-friendly, workspace for both, wifi included. Close to universities. Stable lease, understanding landlord.',
    price_huf: 150000,
    address: 'Béke utca 34, Budapest',
    latitude: 47.428700,
    longitude: 19.064100,
    bedrooms: 2,
    bathrooms: 1,
    size_sqm: 48,
    district: 21,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1560448075-cbc16bb4af8e?w=800',
      'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800',
    ],
  },
  {
    title: 'Simple 1BR - Perfect for Budget Students',
    description: 'Simple one-bedroom, perfect for students on budget. Clean, quiet, with workspace. Stable wifi connection, close to shops and public transport.',
    price_huf: 127000,
    address: 'Kerepesi út 45, Budapest',
    latitude: 47.496300,
    longitude: 19.111200,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 31,
    district: 8,
    deposit_months: 1,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    ],
  },
  {
    title: 'Affordable Apartment Near University - Wifi & Workspace',
    description: 'Affordable apartment near major universities. Dedicated workspace, stable wifi, quiet for studying. Budget lease terms, flexible landlord.',
    price_huf: 138000,
    address: 'Hungária körút 112, Budapest',
    latitude: 47.503600,
    longitude: 19.103400,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 35,
    district: 14,
    deposit_months: 2,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
      'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800',
    ],
  },
  {
    title: '120k HUF Studio - Budget Student Essential',
    description: 'Entry-level studio at exactly 120k HUF. Perfect for students on tight budget. Workspace, wifi, clean. Quiet neighborhood, understanding landlord, stable lease.',
    price_huf: 120000,
    address: 'Könyves Kálmán körút 88, Budapest',
    latitude: 47.470800,
    longitude: 19.101500,
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 27,
    district: 9,
    deposit_months: 1,
    is_available: true,
    image_urls: [
      'https://images.unsplash.com/photo-1560185127-6ed632ed5c4f?w=800',
      'https://images.unsplash.com/photo-1560448204-61dc36dc98c8?w=800',
    ],
  },
];

async function seedAdditionalApartments() {
  console.log('🌱 Seeding additional budget-friendly apartments...\n');

  try {
    const { data, error } = await supabase
      .from('apartments')
      .insert(additionalApartments)
      .select();

    if (error) {
      console.error('❌ Error seeding apartments:', error);
      return;
    }

    console.log(`✅ Successfully added ${data?.length} apartments\n`);
    
    // Show summary
    data?.forEach((apt, index) => {
      console.log(`${index + 1}. ${apt.title}`);
      console.log(`   District ${apt.district} - ${apt.price_huf.toLocaleString()} HUF`);
      console.log(`   ${apt.bedrooms} bed, ${apt.bathrooms} bath, ${apt.size_sqm} sqm\n`);
    });

    // Get total count
    const { count } = await supabase
      .from('apartments')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total apartments in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

seedAdditionalApartments();
