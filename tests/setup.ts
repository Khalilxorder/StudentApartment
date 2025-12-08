// Test setup file
import { expect } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Load .env.test file
config({ path: path.resolve(__dirname, '../.env.test') });

// Ensure required env vars are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL not set, using dummy value');
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set, using dummy value');
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-test';
}

// Add custom matchers or global test utilities here
