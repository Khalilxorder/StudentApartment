import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const apartments = [
            {
                title: 'Cozy Studio in Belváros',
                description: 'Beautiful studio apartment in the heart of Budapest, District 1. Perfect for students! Walking distance to universities, cafes, and cultural sites. Fully furnished with modern amenities.',
                monthly_rent_huf: 120000,
                district: 'District 1',
                bedrooms: 1,
                room_count: 2,
                bathrooms: 1,
                size_sqm: 35,
                furnished: true,
                has_elevator: true,
                address: 'Váci utca 15, Budapest',
                latitude: 47.4979,
                longitude: 19.0402,
                status: 'published',
                is_available: true,
            },
            {
                title: 'Modern 2BR Near Keleti Station',
                description: 'Spacious 2-bedroom apartment in District 7, near Keleti train station. Fully furnished with modern amenities, high-speed WiFi, and washing machine. Great transport links.',
                monthly_rent_huf: 180000,
                district: 'District 7',
                bedrooms: 2,
                room_count: 3,
                bathrooms: 1,
                size_sqm: 55,
                furnished: true,
                has_elevator: false,
                address: 'Kerepesi út 45, Budapest',
                latitude: 47.5020,
                longitude: 19.0827,
                status: 'published',
                is_available: true,
            },
            {
                title: 'Luxury 3BR in Zugló',
                description: 'Premium 3-bedroom apartment in quiet Zugló district (District 14). Perfect for families or groups. Features include air conditioning, balcony, and secure parking.',
                monthly_rent_huf: 250000,
                district: 'District 14',
                bedrooms: 3,
                room_count: 4,
                bathrooms: 2,
                size_sqm: 85,
                furnished: true,
                has_elevator: true,
                address: 'Czobor utca 12, Budapest',
                latitude: 47.5180,
                longitude: 19.1050,
                status: 'published',
                is_available: true,
            },
            {
                title: 'Student-Friendly Room in Ferencváros',
                description: 'Affordable room in District 5, Ferencváros. Close to Corvinus University and Central European University. Shared kitchen and bathroom. Utilities included.',
                monthly_rent_huf: 95000,
                district: 'District 5',
                bedrooms: 1,
                room_count: 2,
                bathrooms: 1,
                size_sqm: 20,
                furnished: true,
                has_elevator: false,
                address: 'Ráday utca 8, Budapest',
                latitude: 47.4850,
                longitude: 19.0620,
                status: 'published',
                is_available: true,
            },
            {
                title: 'Riverside Apartment in Újpest',
                description: 'Beautiful apartment in District 4 with Danube river views. Modern design, quiet neighborhood, excellent public transport. Perfect for professionals.',
                monthly_rent_huf: 160000,
                district: 'District 4',
                bedrooms: 2,
                room_count: 3,
                bathrooms: 1,
                size_sqm: 60,
                furnished: true,
                has_elevator: true,
                address: 'Váci út 120, Budapest',
                latitude: 47.5650,
                longitude: 19.0880,
                status: 'published',
                is_available: true,
            },
        ];

        const { data, error } = await supabase.from('apartments').insert(apartments).select();

        if (error) {
            logger.error({ err: error }, 'Seed error:');
            return NextResponse.json({ error: error.message, details: error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully seeded ${data?.length || 0} apartments!`,
            apartments: data
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Seed endpoint error:');
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
