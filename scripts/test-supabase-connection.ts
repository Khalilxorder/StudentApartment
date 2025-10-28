#!/usr/bin/env tsx
/**
 * Test Supabase Connection
 * Verifies your Supabase credentials are working
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('📋 Environment Check:');
  console.log('  URL:', supabaseUrl);
  console.log('  Anon Key:', anonKey ? `${anonKey.substring(0, 20)}...` : '❌ MISSING');
  console.log('  Service Key:', serviceKey ? `${serviceKey.substring(0, 20)}...` : '❌ MISSING');
  console.log('');

  // Test 1: Anon key
  console.log('Test 1: Testing with ANON key...');
  const supabaseAnon = createClient(supabaseUrl, anonKey);

  try {
    const { data, error } = await supabaseAnon.from('apartments').select('count').limit(1);
    if (error) {
      console.log('  ⚠️  Anon key test:', error.message);
    } else {
      console.log('  ✅ Anon key works!');
    }
  } catch (err: any) {
    console.log('  ❌ Anon key failed:', err.message);
  }

  console.log('');

  // Test 2: Service role key
  console.log('Test 2: Testing with SERVICE ROLE key...');
  const supabaseService = createClient(supabaseUrl, serviceKey);

  try {
    const { data: buckets, error } = await supabaseService.storage.listBuckets();
    if (error) {
      console.log('  ❌ Service key test failed:', error.message);
      console.log('  📋 This means your SUPABASE_SERVICE_ROLE_KEY is invalid or expired\n');
      console.log('  🔧 How to fix:');
      console.log('     1. Go to: https://app.supabase.com/project/kdlxbtuovimrouwuxoyc/settings/api');
      console.log('     2. Copy the "service_role" secret key');
      console.log('     3. Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
      console.log('     4. Run this test again\n');
    } else {
      console.log('  ✅ Service key works!');
      console.log('  📦 Existing buckets:', buckets?.map(b => b.name).join(', ') || 'none');
    }
  } catch (err: any) {
    console.log('  ❌ Service key failed:', err.message);
  }

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 Connection Test Complete');
  console.log('═══════════════════════════════════════');
}

testConnection();
