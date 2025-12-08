import {
  createBrowserClient,
  createServerClient,
  type CookieOptions,
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

const cookieOptions: CookieOptions = {
  maxAge: 60 * 60 * 24 * 365 * 10,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
};

const getServerCookieStore = (): any | null => {
  // Use lib/supabase/server.ts for server-side cookie handling
  return null;
};

const getServerClient = (): SupabaseClient => {
  try {
    const cookieStore = getServerCookieStore();
    if (!cookieStore) {
      throw new Error('No cookie store available');
    }

    return createServerClient(getUrl(), getAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...cookieOptions, ...options })
            );
          } catch {
            // Called from a Server Component without mutable cookies support.
            // Middleware should refresh the session in that scenario.
          }
        },
      },
    }) as SupabaseClient;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Supabase server client falling back to browser client (no cookies context).');
    }
    return getBrowserClient();
  }
};

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
  if (typeof window === 'undefined') {
    return getServerClient();
  }
  return getBrowserClient();
}

export function getBrowserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') {
    return getServerClient();
  }
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

export const supabase: SupabaseClient =
  typeof window === 'undefined' ? (null as unknown as SupabaseClient) : getBrowserClient();
