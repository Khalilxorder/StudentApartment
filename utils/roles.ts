// Role-Based Access Control Utilities
// Manages user roles: user, owner, admin

import { createClient } from '@/utils/supabaseClient';

export type UserRole = 'user' | 'owner' | 'admin';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  verified: boolean;
  preferences?: Record<string, any>;
}

/**
 * Get user's role from user_profiles table
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return 'user'; // Default to user role
  }
  
  return data.role as UserRole;
}

/**
 * Get full user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as UserProfile;
}

/**
 * Check if user has required role
 * Throws error if unauthorized
 */
export async function requireRole(userId: string, allowedRoles: UserRole[]): Promise<void> {
  const role = await getUserRole(userId);
  
  if (!allowedRoles.includes(role)) {
    throw new Error(`Unauthorized. Required roles: ${allowedRoles.join(', ')}`);
  }
}

/**
 * Check if user is owner
 */
export async function isOwner(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'owner' || role === 'admin';
}

/**
 * Check if user is admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId);
  return role === 'admin';
}

/**
 * Update user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<boolean> {
  // Verify admin permission
  await requireRole(adminId, ['admin']);
  
  const supabase = createClient();
  
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq('id', userId);
  
  return !error;
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    });
  
  return !error;
}

/**
 * Switch user between user and owner role
 * (Users can be both - e.g., a user who also lists apartments)
 */
export async function switchRole(
  userId: string,
  newRole: 'user' | 'owner'
): Promise<boolean> {
  const currentRole = await getUserRole(userId);
  
  // Only allow switching between user and owner
  if (currentRole === 'admin') {
    throw new Error('Admins cannot switch roles');
  }
  
  return upsertUserProfile(userId, { role: newRole });
}

/**
 * Get user's current email
 */
export async function getUserEmail(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email || null;
}

/**
 * Get current user's profile
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  return getUserProfile(user.id);
}

/**
 * Ensure user profile exists (create if missing)
 */
export async function ensureUserProfile(userId: string, email: string): Promise<void> {
  const supabase = createClient();
  
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();
  
  if (!existing) {
    // Create default profile
    await supabase.from('user_profiles').insert({
      id: userId,
      role: 'user',
      full_name: email.split('@')[0], // Use email prefix as default name
    });
  }
}
