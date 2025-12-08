
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_IMAGES = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
    'https://images.unsplash.com/photo-1502005229766-939cb9342514',
    'https://images.unsplash.com/photo-1484154218962-a1c002085d2f'
];

async function seedImages() {
    console.log('Fetching apartments without images...');

    // Get all apartments
    const { data: apartments, error: aptError } = await supabase
        .from('apartments')
        .select('id');

    if (aptError) {
        console.error('Error fetching apartments:', aptError);
        return;
    }

    console.log(`Found ${apartments.length} apartments.`);

    for (const apt of apartments) {
        // Check for existing images in apartment_media
        const { count, error: countError } = await supabase
            .from('apartment_media')
            .select('*', { count: 'exact', head: true })
            .eq('apartment_id', apt.id);

        if (countError) {
            console.error(`Error checking media for ${apt.id}:`, countError);
            continue;
        }

        if (count && count > 0) {
            // If has images but less than 3, add more for scrolling test
            if (count < 3) {
                console.log(`Apartment ${apt.id} has ${count} images. Adding more for scrolling test...`);
                await addImages(apt.id, 5 - count);
            } else {
                console.log(`Apartment ${apt.id} already has ${count} images.`);
            }
        } else {
            console.log(`Apartment ${apt.id} has no images. Seeding...`);
            await addImages(apt.id, 5);
        }
    }

    console.log('Seeding complete!');
}

async function addImages(apartmentId: string, count: number) {
    const imagesToAdd = [];
    for (let i = 0; i < count; i++) {
        const url = TEST_IMAGES[i % TEST_IMAGES.length];
        imagesToAdd.push({
            apartment_id: apartmentId,
            file_url: url,
            storage_path: `seeded/${Date.now()}_${i}.jpg`, // Fake path
            is_primary: i === 0, // First one primary if adding fresh
            width: 1200,
            height: 800
        });
    }

    const { error } = await supabase
        .from('apartment_media')
        .insert(imagesToAdd);

    if (error) {
        console.error(`Failed to add images for ${apartmentId}:`, error);
    } else {
        console.log(`Added ${count} images to ${apartmentId}`);
    }
}

seedImages();
