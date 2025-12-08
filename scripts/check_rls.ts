
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
    console.log('🕵️ Checking RLS Policies impact...');

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
        console.error('Missing keys');
        return;
    }

    // 1. Check with Service Role (Admin)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { count: adminCount, error: adminError } = await adminClient
        .from('apartment_media')
        .select('*', { count: 'exact', head: true });

    console.log(`Admin Client Media Count: ${adminCount} (Error: ${adminError?.message || 'None'})`);

    // 2. Check with Anon Key (Public)
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    const { count: anonCount, error: anonError } = await anonClient
        .from('apartment_media')
        .select('*', { count: 'exact', head: true });

    console.log(`Anon Client Media Count: ${anonCount} (Error: ${anonError?.message || 'None'})`);

    if (adminCount !== anonCount) {
        console.error('⚠️ RLS Policy Issue Detected! Anon user cannot see all images.');
        // Try to fetch policies info if possible (usually requires SQL, skipping for now, inferring from result)
    } else {
        console.log('✅ Counts match. RLS likely not the issue for simple counting.');
    }
}

main().catch(console.error);
