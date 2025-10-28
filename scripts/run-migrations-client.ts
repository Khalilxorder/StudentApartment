import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function runMigrations() {
  console.log('🚀 Starting database migrations using Supabase client...');

  try {
    // Get list of migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Check which migrations have already been applied
    const { data: appliedMigrations, error: fetchError } = await supabase
      .from('app_migrations')
      .select('filename');

    if (fetchError && !fetchError.message.includes('relation "public.app_migrations" does not exist')) {
      throw fetchError;
    }

    const appliedFiles = new Set(appliedMigrations?.map(m => m.filename) || []);

    // Create migrations table if it doesn't exist
    if (!appliedMigrations) {
      console.log('Creating migrations tracking table...');
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS public.app_migrations (
            filename text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
          );
        `
      });

      if (createError) {
        console.log('Could not create migrations table via RPC, trying direct SQL...');
        // Try direct approach
        try {
          await supabase.from('app_migrations').select('count').limit(1);
        } catch (e) {
          // Table doesn't exist, we'll handle this differently
          console.log('Migrations table does not exist, will create it manually');
        }
      }
    }

    let appliedCount = 0;

    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`📄 Applying migration: ${file}`);

      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        // Try to execute the SQL using RPC
        const { error } = await supabase.rpc('exec_sql', { sql });

        if (error) {
          console.error(`❌ Failed to apply migration ${file}:`, error.message);
          // Continue with other migrations
          continue;
        }

        // Record the migration as applied
        const { error: insertError } = await supabase
          .from('app_migrations')
          .insert({ filename: file });

        if (insertError) {
          console.error(`⚠️  Migration ${file} applied but could not record it:`, insertError.message);
        }

        appliedCount++;
        console.log(`✅ Applied migration: ${file}`);

      } catch (err) {
        console.error(`❌ Error applying migration ${file}:`, err);
        continue;
      }
    }

    console.log(`🎉 Migration complete! Applied ${appliedCount} migrations.`);

  } catch (error) {
    console.error('❌ Migration runner failed:', error);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}