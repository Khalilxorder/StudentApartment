#!/usr/bin/env tsx
/**
 * Setup Storage Bucket for Apartments
 * 
 * This script ensures the 'apartments' storage bucket exists with proper configuration:
 * - Creates bucket if missing
 * - Sets public access for preview URLs
 * - Configures file size limits and allowed MIME types
 * 
 * Usage: npm run setup:storage
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY or ANON_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase Storage bucket for apartments...\n');

  const bucketName = 'apartments';

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' already exists`);
      
      // Try to update bucket settings
      const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });

      if (updateError) {
        console.warn('⚠️  Could not update bucket settings:', updateError.message);
        console.log('   This is OK if you set it manually in Supabase dashboard');
      } else {
        console.log('✅ Bucket settings updated (public: true, 10MB limit)');
      }
    } else {
      console.log(`📦 Creating bucket '${bucketName}'...`);
      
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError.message);
        console.log('\n📋 Manual steps:');
        console.log('   1. Go to Supabase Dashboard → Storage');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name: apartments');
        console.log('   4. Enable "Public bucket"');
        console.log('   5. Set file size limit: 10MB');
        process.exit(1);
      }

      console.log('✅ Bucket created successfully');
    }

    // Test upload
    console.log('\n🧪 Testing bucket access...');
    const testFile = Buffer.from('test-image-data');
    const testPath = `test-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testFile, { 
        upsert: false,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      console.log('\n📋 Possible issues:');
      console.log('   - Bucket might not be public');
      console.log('   - Storage RLS policies might be blocking uploads');
      console.log('   - Service role key might not have permissions');
      process.exit(1);
    }

    const { data: publicUrl } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testPath);

    console.log('✅ Upload test successful');
    console.log('   Test file URL:', publicUrl.publicUrl);

    // Cleanup test file
    await supabase.storage.from(bucketName).remove([testPath]);
    console.log('✅ Test file cleaned up');

    console.log('\n🎉 Storage bucket setup complete!\n');
    console.log('📋 Bucket configuration:');
    console.log('   Name: apartments');
    console.log('   Public: Yes');
    console.log('   Max file size: 10MB');
    console.log('   Allowed types: JPEG, PNG, WebP, GIF\n');

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    process.exit(1);
  }
}

setupStorageBucket();
