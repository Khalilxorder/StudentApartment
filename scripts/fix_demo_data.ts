
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Apartment ID from user's URL
const APARTMENT_ID = '2a2dc4b0-cef9-436b-bba7-cdb07cb5da90';

async function main() {
    console.log('🚀 Starting Data Fix Script...');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !DATABASE_URL) {
        console.error('❌ Missing environment variables!');
        process.exit(1);
    }

    // 1. Create apartment_favorites table directly via Postgres
    console.log('\n📦 Checking and creating table "apartment_favorites"...');
    const pgClient = new Client({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pgClient.connect();

        // Check if table exists
        const res = await pgClient.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'apartment_favorites'
      );
    `);

        if (res.rows[0].exists) {
            console.log('✅ Table "apartment_favorites" already exists.');
        } else {
            console.log('⚠️ Table missing. Creating "apartment_favorites"...');
            await pgClient.query(`
        CREATE TABLE IF NOT EXISTS public.apartment_favorites (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT unique_user_apartment UNIQUE (user_id, apartment_id)
        );

        CREATE INDEX IF NOT EXISTS idx_apartment_favorites_user_id ON public.apartment_favorites(user_id);
        CREATE INDEX IF NOT EXISTS idx_apartment_favorites_apartment_id ON public.apartment_favorites(apartment_id);

        -- RLS Policies
        ALTER TABLE public.apartment_favorites ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if any to avoid conflict
        DROP POLICY IF EXISTS "Users can view their own favorites" ON public.apartment_favorites;
        DROP POLICY IF EXISTS "Users can add their own favorites" ON public.apartment_favorites;
        DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.apartment_favorites;

        CREATE POLICY "Users can view their own favorites" ON public.apartment_favorites FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can add their own favorites" ON public.apartment_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can delete their own favorites" ON public.apartment_favorites FOR DELETE USING (auth.uid() = user_id);

        GRANT SELECT, INSERT, DELETE ON public.apartment_favorites TO authenticated;
        GRANT SELECT ON public.apartment_favorites TO anon;
      `);
            console.log('✅ Table "apartment_favorites" created successfully!');
        }
    } catch (err: any) {
        console.error('❌ Postgres Error:', err.message);
    } finally {
        await pgClient.end();
    }

    // 2. Assign Owner to Apartment via Supabase Client
    console.log('\n👤 Assigning owner to apartment...');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    try {
        // Get a user to be the owner (e.g., the first user found)
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

        if (usersError || !users || users.length === 0) {
            throw new Error('Could not find any users to assign as owner.');
        }

        const ownerId = users[0].id;
        const ownerEmail = users[0].email;
        console.log(`Found user: ${ownerEmail} (${ownerId})`);

        // Update apartment
        const { error: updateError } = await supabase
            .from('apartments')
            .update({ owner_id: ownerId })
            .eq('id', APARTMENT_ID);

        if (updateError) {
            throw new Error(`Failed to update apartment: ${updateError.message}`);
        }

        console.log(`✅ Apartment ${APARTMENT_ID} updated with owner_id: ${ownerId}`);

    } catch (err: any) {
        console.error('❌ Supabase Error:', err.message);
    }

    console.log('\n✨ Fix Script Complete!');
}

main().catch(console.error);
