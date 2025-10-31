/**
 * Supabase Client Factory - Build-Safe Pattern
 * 
 * CRITICAL: This module provides lazy-loading Supabase clients
 * to prevent process.env access at module load time (which fails during Next.js build)
 * 
 * ❌ WRONG - Runs at build time:
 * const supabase = createClient(process.env.SUPABASE_URL, ...);
 * 
 * ✅ CORRECT - Only runs at runtime:
 * const supabase = getSupabaseClient();
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Lazy-load Supabase client with service role key
 * Used in API routes for server-side operations
 * 
 * @returns Supabase client instance
 * @throws Error if credentials are missing
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in environment.'
    );
  }

  return createClient(url, key);
}

/**
 * Lazy-load Supabase client with anon key (public)
 * Used for client-side operations
 * 
 * @returns Supabase client instance
 * @throws Error if credentials are missing
 */
export function getSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in environment.'
    );
  }

  return createClient(url, key);
}
