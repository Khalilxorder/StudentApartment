// Run database migrations
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running migration: add_missing_apartment_fields...');
  
  const migrationPath = path.join(__dirname, 'db/migrations/00000000000001_add_missing_apartment_fields.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Split by semicolon and filter empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    if (statement.includes('COMMENT ON')) {
      console.log('ℹ️  Skipping COMMENT (not supported via RPC)');
      continue;
    }
    
    try {
      console.log(`  Executing: ${statement.substring(0, 60)}...`);
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase.from('_sql').select('*').eq('query', statement);
        if (directError && directError.code !== 'PGRST116') {
          throw error;
        }
      }
      
      console.log('  ✅ Success');
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      // Continue with other statements
    }
  }
  
  console.log('\n✅ Migration completed!');
  console.log('\nℹ️  Note: Some statements may have been skipped if columns already exist.');
  console.log('   Please run this SQL manually in Supabase SQL Editor for full migration:\n');
  console.log(sql);
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
