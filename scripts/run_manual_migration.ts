
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function runMigration() {
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
        console.error('❌ No DATABASE_URL or SUPABASE_DB_URL found in .env.local');
        process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    const client = new Client({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false } // Required for Supabase connection
    });

    try {
        await client.connect();
        console.log('✅ Connected successfully.');

        const migrationFile = path.join(process.cwd(), 'supabase', 'migrations', '20241207_ai_search_agent.sql');
        if (!fs.existsSync(migrationFile)) {
            console.error(`❌ Migration file not found: ${migrationFile}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(migrationFile, 'utf8');
        console.log(`📄 Reading migration file: 20241207_ai_search_agent.sql`);

        console.log('🚀 Executing migration...');
        await client.query(sql);
        console.log('✅ Migration applied successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();
