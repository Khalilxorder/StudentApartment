#!/usr/bin/env tsx
/**
 * Run Database Migration
 * 
 * Automatically runs the RUN_THIS_FORCE_CLEAN_MIGRATION.sql file
 * 
 * Usage: npm run db:migrate:force
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running force clean migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'RUN_THIS_FORCE_CLEAN_MIGRATION.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');
    console.log(`📄 Loaded migration file (${sql.length} bytes)`);

    // Execute the migration
    console.log('⚙️  Executing migration SQL...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);
      console.log('\n📋 Manual fallback:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Open: RUN_THIS_FORCE_CLEAN_MIGRATION.sql');
      console.log('   3. Run the entire file');
      process.exit(1);
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify the apartments table exists
    const { data: tables, error: verifyError } = await supabase
      .from('apartments')
      .select('id')
      .limit(1);

    if (verifyError) {
      console.warn('⚠️  Could not verify apartments table:', verifyError.message);
    } else {
      console.log('✅ Verified: apartments table exists\n');
    }

    console.log('🎉 Migration complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Run: npm run setup:storage');
    console.log('   2. Run: npm run seed:realistic');
    console.log('   3. Run: npm run dev\n');

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.log('\n📋 Please run the migration manually in Supabase Dashboard');
    process.exit(1);
  }
}

runMigration();
