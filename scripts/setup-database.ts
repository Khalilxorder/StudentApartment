// Database setup script for initializing PostGIS + pgvector
// This script creates the database, enables extensions, and runs migrations

import { Client } from 'pg';
import { POSTGIS_MIGRATION, SEED_DATA_MIGRATION } from '../scripts/database-migrations';

async function setupDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'postgres', // Connect to default database first
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'student_apartments';
    console.log(`📦 Creating database '${dbName}'...`);

    await client.query(`CREATE DATABASE "${dbName}" WITH OWNER = $1`, [
      process.env.DB_USER || 'postgres'
    ]).catch(err => {
      if (!err.message.includes('already exists')) {
        throw err;
      }
      console.log('ℹ️ Database already exists');
    });

    await client.end();

    // Connect to the new database
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: dbName,
    });

    await dbClient.connect();

    // Enable extensions
    console.log('🔧 Enabling PostGIS and pgvector extensions...');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    await dbClient.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Run migrations
    console.log('📋 Running PostGIS migration...');
    const migrationStatements = POSTGIS_MIGRATION.split(';').filter(stmt => stmt.trim());

    for (const statement of migrationStatements) {
      if (statement.trim()) {
        await dbClient.query(statement);
      }
    }

    // Seed data
    console.log('🌱 Seeding initial data...');
    const seedStatements = SEED_DATA_MIGRATION.split(';').filter(stmt => stmt.trim());

    for (const statement of seedStatements) {
      if (statement.trim()) {
        await dbClient.query(statement);
      }
    }

    await dbClient.end();

    console.log('✅ Database setup completed successfully!');
    console.log(`📊 Database '${dbName}' is ready for use.`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run sync:search');
    console.log('2. Run: npm run sync:embeddings');
    console.log('3. Run: npm run sync:commute');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// CLI runner
if (require.main === module) {
  setupDatabase().catch(console.error);
}