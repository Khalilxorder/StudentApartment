// FILE: types/owner-profile.ts
// Owner profile types for the Student Apartments platform

export type OwnerProfile = {
  // Core identification
  id: string; // UUID, linked to auth.users
  
  // Basic information
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  
  // Business information
  company_name: string | null;
  tax_id: string | null;
  license_number?: string | null;
  website: string | null;
  
  // Experience
  years_experience: '0-2' | '3-5' | '6-10' | '10+' | null;
  specializations: string[] | null; // e.g., ['Student Housing', 'Luxury Properties']
  
  // Contact preferences
  preferred_contact_method: 'email' | 'phone' | 'message';
  
  // Social media
  social_links: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
  
  // Payment / Verification
  stripe_account_id: string | null;
  verification_status: 'not_verified' | 'pending' | 'verified' | 'rejected';
  verification_submitted_at: string | null;
  verification_completed_at: string | null;
  payout_enabled: boolean;
  bank_account: string | null;
  
  // Analytics
  total_listings: number;
  active_listings: number;
  response_rate: number; // 0.00 to 100.00
  average_response_time_minutes: number;
  
  // Profile completeness (auto-calculated)
  profile_completeness_score: number; // 0-100
  last_profile_update: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
};

export type OwnerProfileFormData = Omit<
  OwnerProfile,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'stripe_account_id'
  | 'verification_status'
  | 'verification_submitted_at'
  | 'verification_completed_at'
  | 'payout_enabled'
  | 'bank_account'
  | 'total_listings'
  | 'active_listings'
  | 'response_rate'
  | 'average_response_time_minutes'
  | 'profile_completeness_score'
  | 'last_profile_update'
>;

/**
 * Calculate profile completeness score based on filled fields
 * Score breakdown:
 * - Full name: 15 points
 * - Phone: 10 points
 * - Bio: 15 points
 * - Company name: 10 points
 * - Website: 10 points
 * - Specializations: 15 points
 * - Years experience: 10 points
 * - License number: 5 points (optional but valuable)
 * - Avatar: 5 points (optional profile picture)
 * - Social links: 5 points
 * Maximum: 100 points
 */
export function calculateProfileCompletenessScore(profile: Partial<OwnerProfile>): number {
  let score = 0;

  if (profile.full_name && profile.full_name.trim().length > 0) score += 15;
  if (profile.phone && profile.phone.trim().length > 0) score += 10;
  if (profile.bio && profile.bio.trim().length > 0) score += 15;
  if (profile.company_name && profile.company_name.trim().length > 0) score += 10;
  if (profile.website && profile.website.trim().length > 0) score += 10;
  if (profile.specializations && profile.specializations.length > 0) score += 15;
  if (profile.years_experience && profile.years_experience.length > 0) score += 10;
  if (profile.license_number && profile.license_number.trim().length > 0) score += 5;
  if (profile.avatar_url && profile.avatar_url.trim().length > 0) score += 5;

  if (profile.social_links) {
    const hasLink =
      (profile.social_links.facebook && profile.social_links.facebook.trim().length > 0) ||
      (profile.social_links.instagram && profile.social_links.instagram.trim().length > 0) ||
      (profile.social_links.linkedin && profile.social_links.linkedin.trim().length > 0);
    if (hasLink) score += 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Get profile completeness level description
 */
export function getCompletenessLevel(score: number): 'incomplete' | 'partial' | 'good' | 'excellent' {
  if (score < 25) return 'incomplete';
  if (score < 50) return 'partial';
  if (score < 75) return 'good';
  return 'excellent';
}

/**
 * Get profile completeness percentage
 */
export function getCompletenessPercentage(score: number): number {
  return Math.round(Math.max(0, Math.min(score, 100)));
}
