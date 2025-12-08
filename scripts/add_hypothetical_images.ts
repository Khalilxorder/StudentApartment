
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLACEHOLDER_IMAGES = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522771753037-ccbf3a14c305?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1484154218962-a1c002085aac?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494203484021-3c454daf695d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80'
];

async function main() {
    console.log('🚀 Starting Image Population Script (via Supabase API)...');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        console.error('❌ Missing SUPABASE_URL or SERVICE_ROLE_KEY environment variables!');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    try {
        // 1. Find apartments with their media
        const { data: apartments, error } = await supabase
            .from('apartments')
            .select('id, title, apartment_media(id)');

        if (error) {
            throw new Error(`Failed to fetch apartments: ${error.message}`);
        }

        if (!apartments) {
            console.log('No apartments found.');
            return;
        }

        // Filter for those with NO media
        const apartmentsWithoutImages = apartments.filter((a: any) =>
            !a.apartment_media || a.apartment_media.length === 0
        );

        console.log(`Found ${apartmentsWithoutImages.length} apartments without images (out of ${apartments.length} total).`);

        if (apartmentsWithoutImages.length === 0) {
            console.log('✅ No apartments missing images.');
            return;
        }

        // 2. Add images for each apartment
        for (const apt of apartmentsWithoutImages) {
            console.log(`Adding images for: ${apt.title} (${apt.id})`);

            const numImages = 3 + Math.floor(Math.random() * 3); // 3 to 5 images
            const selectedImages = [...PLACEHOLDER_IMAGES].sort(() => 0.5 - Math.random()).slice(0, numImages);

            const mediaInserts = selectedImages.map((imageUrl, index) => ({
                apartment_id: apt.id,
                file_url: imageUrl,
                storage_path: 'placeholder/' + path.basename(imageUrl),
                is_primary: index === 0
            }));

            const { error: insertError } = await supabase
                .from('apartment_media')
                .insert(mediaInserts);

            if (insertError) {
                console.error(`Failed to insert images for ${apt.title}:`, insertError.message);
            } else {
                console.log(`✅ Added ${numImages} images.`);
            }
        }

        console.log('✅ Successfully processed all apartments!');

    } catch (err: any) {
        console.error('❌ Error:', err.message);
    }
}

main().catch(console.error);
