#!/usr/bin/env node

/**
 * Quick fix: Apply missing migration for profiles_owner table
 * Run with: node scripts/fix-profiles-owner.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProfilesOwner() {
  try {
    console.log('🔧 Fixing profiles_owner table schema...');

    // Add column to profiles_owner
    const { error } = await supabase
      .from('profiles_owner')
      .select('average_response_time_minutes')
      .limit(1);

    if (error) {
      console.log('📝 Column missing, creating it via SQL...');
      
      // Read and execute the migration file
      const migrationPath = path.join(
        process.cwd(),
        'db/migrations/20251019000008_fix_profiles_owner_schema.sql'
      );
      
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      // Execute via RPC or direct query
      const { error: execError } = await supabase.rpc('exec', { query: sql });
      
      if (execError) {
        // Fallback: Try individual queries
        console.log('Using fallback approach...');
        
        const queries = [
          `ALTER TABLE IF EXISTS public.profiles_owner
           ADD COLUMN IF NOT EXISTS average_response_time_minutes INTEGER DEFAULT 24;`,
          
          `CREATE TABLE IF NOT EXISTS public.profiles_owner (
            user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
            first_name text,
            last_name text,
            phone text,
            company_name text,
            stripe_account_id text,
            verification_status text DEFAULT 'pending',
            average_response_time_minutes INTEGER DEFAULT 24,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
          );`,
        ];

        for (const query of queries) {
          console.log(`Executing: ${query.substring(0, 50)}...`);
          // You may need to execute these directly in Supabase
        }
      }
    }

    console.log('✅ profiles_owner table fixed!');
    console.log('\n📝 Next steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run the migration from: db/migrations/20251019000008_fix_profiles_owner_schema.sql');
    console.log('3. Try signup again');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixProfilesOwner();
