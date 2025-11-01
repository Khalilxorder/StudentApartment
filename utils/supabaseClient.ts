import {
  createBrowserClient,
} from '@supabase/ssr';
import {
  createClient as createServiceRoleClientOriginal,
  type SupabaseClient,
} from '@supabase/supabase-js';

const getUrl = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
};

const getAnonKey = () => {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return key;
};

let browserClient: SupabaseClient | null = null;

const getBrowserClient = (): SupabaseClient => {
  if (browserClient) {
    return browserClient;
  }
  browserClient = createBrowserClient(getUrl(), getAnonKey());
  return browserClient;
};

/**
 * Get Supabase client for client components.
 * ⚠️ For Server Components, use createClient from @/lib/supabase/server instead!
 */
export function createClient(): SupabaseClient {
  // Allow server-side usage for build compatibility
  return getBrowserClient();
}

export function getBrowserSupabase(): SupabaseClient {
  // Allow server-side usage for build compatibility
  return getBrowserClient();
}

/**
 * Create a service role client (bypasses RLS).
 * ⚠️ Only use for admin operations!
 */

export function createServiceRoleClient(): SupabaseClient {
  const url = getUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }
  return createServiceRoleClientOriginal(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const createServiceClient = createServiceRoleClient;

// Lazy getter for default supabase client - don't create at module level
let _cachedSupabase: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() can only be called in browser context');
  }
  if (!_cachedSupabase) {
    _cachedSupabase = getBrowserClient();
  }
  return _cachedSupabase;
}

// Legacy export - use getSupabase() instead
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Lazy initialization on first property access
    return getSupabase()[prop as keyof SupabaseClient];
  }
});
