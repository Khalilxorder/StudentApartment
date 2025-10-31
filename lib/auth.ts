/**
 * Authentication Utilities
 * Handles user authentication, session management, and authorization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Lazy-load Supabase client - allows dependency injection for testing
function getSupabaseClientInstance(client?: SupabaseClient) {
  if (client) return client;
  
  // Lazy initialize only when called (not at module load time)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

export interface AuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
}

export interface AuthCheckResult {
  allowed: boolean;
  user?: any;
  redirectTo?: string;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string, client?: SupabaseClient): Promise<AuthResult> {
  try {
    // Validate input
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { firstName?: string; lastName?: string; role?: string },
  client?: SupabaseClient
): Promise<AuthResult> {
  try {
    // Validate input
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: metadata?.firstName,
          last_name: metadata?.lastName,
          role: metadata?.role || 'student',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Sign out current user
 */
export async function signOut(client?: SupabaseClient): Promise<AuthResult> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Sign out failed' };
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(client?: SupabaseClient): Promise<AuthResult> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.getUser();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, user: null };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return { success: false, error: 'Failed to get current user' };
  }
}

/**
 * Reset password for email
 */
export async function resetPassword(email: string, client?: SupabaseClient): Promise<AuthResult> {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email format' };
    }

    const supabaseClient = getSupabaseClientInstance(client);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Password reset failed' };
  }
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string, client?: SupabaseClient): Promise<AuthResult> {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error) {
    return { success: false, error: 'Password update failed' };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string, email: string, type: 'email' | 'recovery' = 'email', client?: SupabaseClient): Promise<AuthResult> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.verifyOtp({
      email,
      token,
      type,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    return { success: false, error: 'Email verification failed' };
  }
}

/**
 * Refresh user session
 */
export async function refreshSession(client?: SupabaseClient): Promise<AuthResult> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data, error } = await supabaseClient.auth.refreshSession();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      session: data.session,
    };
  } catch (error) {
    return { success: false, error: 'Session refresh failed' };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(client?: SupabaseClient): Promise<boolean> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data } = await supabaseClient.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

/**
 * Require authentication for protected routes
 */
export async function requireAuth(client?: SupabaseClient): Promise<AuthCheckResult> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      return { allowed: true, user: data.session.user };
    }

    return { allowed: false, redirectTo: '/login' };
  } catch {
    return { allowed: false, redirectTo: '/login' };
  }
}

/**
 * Get user role from metadata
 */
export async function getUserRole(client?: SupabaseClient): Promise<string | null> {
  try {
    const supabaseClient = getSupabaseClientInstance(client);
    const { data } = await supabaseClient.auth.getUser();
    return data.user?.user_metadata?.role || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has permission for action
 */
export function hasPermission(userRole: string | null, action: string): boolean {
  const permissions: Record<string, string[]> = {
    student: ['view_apartments', 'save_searches', 'send_messages', 'leave_reviews', 'book_apartments'],
    owner: ['manage_apartments', 'view_apartments', 'send_messages', 'respond_reviews', 'view_analytics'],
    admin: ['manage_users', 'manage_apartments', 'moderate_content', 'view_analytics', 'system_settings'],
  };

  const rolePermissions = permissions[userRole || ''] || [];
  return rolePermissions.includes(action);
}

/**
 * Middleware helper for API routes
 */
export async function withAuth(handler: Function, requiredRole?: string, client?: SupabaseClient) {
  return async (req: Request, context?: any) => {
    try {
      const supabaseClient = getSupabaseClientInstance(client);
      const { data } = await supabaseClient.auth.getSession();

      if (!data.session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (requiredRole) {
        const userRole = data.session.user.user_metadata?.role;
        if (userRole !== requiredRole && userRole !== 'admin') {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Add user to context
      const enhancedContext = {
        ...context,
        user: data.session.user,
      };

      return handler(req, enhancedContext);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Authentication error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
