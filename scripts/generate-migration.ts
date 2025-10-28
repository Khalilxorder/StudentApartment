// Generate combined migration SQL for manual execution
// This creates a single SQL file that can be run in Supabase dashboard

import fs from 'fs';
import path from 'path';

function generateCombinedMigration() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const outputFile = path.join(__dirname, '..', 'database-setup.sql');

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  let combinedSQL = `-- Combined Database Migration for Student Apartments
-- Generated on ${new Date().toISOString()}
-- Run this SQL in your Supabase SQL Editor

`;

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    combinedSQL += `\n-- ============================================
-- ${file}
-- ============================================\n\n`;
    combinedSQL += sql;
    combinedSQL += '\n\n';
  }

  fs.writeFileSync(outputFile, combinedSQL);
  console.log(`✅ Combined migration SQL generated: ${outputFile}`);
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Open your Supabase dashboard');
  console.log('2. Go to SQL Editor');
  console.log('3. Copy and paste the contents of database-setup.sql');
  console.log('4. Run the SQL');
  console.log('5. Then run: npm run sync:search');
}

// CLI runner
if (require.main === module) {
  generateCombinedMigration();
}