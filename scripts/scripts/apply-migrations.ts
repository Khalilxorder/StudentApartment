import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const resolveDatabaseUrl = () => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'Missing database connection string. Please set DATABASE_URL (or SUPABASE_DB_URL).',
    );
  }

  return url;
};

const connectionString = resolveDatabaseUrl();

const pool = new Pool({
  connectionString,
  ssl: /supabase\.co|supabase\.net/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
});

async function applyMigration(filePath: string) {
  const client = await pool.connect();
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Applying migration: ${path.basename(filePath)}`);

    await client.query('BEGIN');

    // Split SQL into statements and execute each one
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await client.query(trimmedStatement);
        } catch (error) {
          console.error(`Error in statement:`, error);
          console.error(`Statement:`, trimmedStatement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Applied ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Failed to apply ${path.basename(filePath)}:`, err);
    return false;
  } finally {
    client.release();
  }
}

async function applyAllMigrations() {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
  const migrationFiles = [
    '20251020000001_add_viewing_slots_and_bookings.sql',
    '20251020000001_create_moderation_queue.sql',
    '20251020000002_add_privacy_and_duplicate_detection.sql',
    '20251021000000_add_digest_and_analytics_tables.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      const success = await applyMigration(filePath);
      if (!success) {
        console.error(`Failed to apply ${file}`);
        process.exit(1);
      }
    } else {
      console.error(`Migration file not found: ${file}`);
    }
  }

  console.log('🎉 All migrations applied successfully!');
}

applyAllMigrations().catch(console.error).finally(() => pool.end());