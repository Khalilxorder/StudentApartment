#!/usr/bin/env node

/**
 * Health Check Script
 * Performs comprehensive health checks on the Student Apartment platform
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const REDIS_URL = process.env.REDIS_URL;

async function checkSupabase() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('apartments').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection: OK');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection: FAILED', error.message);
    return false;
  }
}

async function checkDatabase() {
  try {
    const { Client } = require('pg');
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('✅ PostgreSQL connection: OK');
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL connection: FAILED', error.message);
    return false;
  }
}

async function checkRedis() {
  try {
    const { Redis } = require('ioredis');
    const redis = new Redis(REDIS_URL);
    await redis.ping();
    await redis.quit();
    console.log('✅ Redis connection: OK');
    return true;
  } catch (error) {
    console.log('❌ Redis connection: FAILED', error.message);
    return false;
  }
}

async function checkAPI(endpoint) {
  return new Promise((resolve) => {
    const url = new URL(endpoint, process.env.NEXTAUTH_URL || 'http://localhost:3000');
    const req = https.request(url, { method: 'GET' }, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ API ${endpoint}: OK`);
        resolve(true);
      } else {
        console.log(`❌ API ${endpoint}: FAILED (${res.statusCode})`);
        resolve(false);
      }
    });

    req.on('error', () => {
      console.log(`❌ API ${endpoint}: FAILED (connection error)`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log(`❌ API ${endpoint}: FAILED (timeout)`);
      resolve(false);
    });

    req.end();
  });
}

async function main() {
  console.log('🏥 Running health checks...\n');

  const results = await Promise.all([
    checkSupabase(),
    checkDatabase(),
    checkRedis(),
    checkAPI('/api/health'),
    checkAPI('/api/apartments'),
  ]);

  const allPassed = results.every(result => result);

  console.log(`\n${allPassed ? '✅' : '❌'} Health check ${allPassed ? 'PASSED' : 'FAILED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, checkSupabase, checkDatabase, checkRedis, checkAPI };