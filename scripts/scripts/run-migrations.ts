'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });
dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

const resolveDatabaseUrl = (): string => {
  const url =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.SUPABASE_POSTGRES_URL;

  if (!url) {
    throw new Error(
      'Missing database connection string. Set DATABASE_URL or SUPABASE_DB_URL.'
    );
  }

  return url;
};

const buildPool = (connectionString: string) =>
  new Pool({
    connectionString,
    ssl: /supabase\.co|supabase\.net/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined,
    // Force IPv4 to avoid IPv6 connectivity issues
    host: connectionString.includes('supabase.co')
      ? connectionString.match(/@([^:]+):/)?.[1]
      : undefined,
  });

async function ensureMigrationsTable(client: any): Promise<void> {
  const createSql = `
    CREATE TABLE IF NOT EXISTS public.app_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
    );
  `;
  await client.query(createSql);
}

async function hasMigrationRun(
  client: any,
  filename: string
): Promise<boolean> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM public.app_migrations WHERE filename = $1;',
    [filename]
  );
  return rowCount > 0;
}

async function applyMigrationFile(
  client: any,
  filePath: string,
  filename: string
): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO public.app_migrations (filename) VALUES ($1);', [
      filename,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runMigrations(): Promise<void> {
  console.log('🔄 Starting database migration process...');

  // Validate environment first
  const connectionString = resolveDatabaseUrl();
  console.log(`📡 Using database: ${connectionString.split('@')[1]?.split('/')[0] || 'unknown'}`);

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migration directory not found: ${MIGRATIONS_DIR}`);
  }

  const pool = buildPool(connectionString);
  const client = await pool.connect();

  try {
    console.log('✅ Database connection established');
    console.log(`📋 Migration directory: ${MIGRATIONS_DIR}`);

    await ensureMigrationsTable(client);

    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`📄 Found ${migrationFiles.length} migration files`);

    for (const filename of migrationFiles) {
      const fullPath = path.join(MIGRATIONS_DIR, filename);

      if (await hasMigrationRun(client, filename)) {
        console.log(`   ↷ Skipping ${filename} (already applied)`);
        continue;
      }

      console.log(`   ➜ Applying ${filename}`);
      try {
        await applyMigrationFile(client, fullPath, filename);
        console.log(`     ✓ Applied ${filename}`);
      } catch (error) {
        console.error(`     ✖ Failed ${filename}`);
        throw error;
      }
    }

    console.log('✅ Database migrations complete');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI runner
runMigrations().catch((error) => {
  const err = error as any;
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    console.error('❌ Database connection failed!');
    console.error('   This usually means:');
    console.error('   1. Supabase project is paused or deleted');
    console.error('   2. Network connectivity issues');
    console.error('   3. Invalid connection string');
    console.error('');
    console.error('   To fix:');
    console.error('   1. Check your Supabase project status at https://supabase.com/dashboard');
    console.error('   2. Verify DATABASE_URL in .env.local');
    console.error('   3. Ensure your IP is allowed (if using Supabase restrictions)');
  } else {
    console.error('❌ Migration runner failed:', error);
  }
  process.exitCode = 1;
});
