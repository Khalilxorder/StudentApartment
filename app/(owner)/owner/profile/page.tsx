'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabaseClient';
import { sanitizeUserInput } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OwnerProfileFormData } from '@/types/owner-profile';
import { calculateProfileCompletenessScore, getCompletenessLevel, getCompletenessPercentage } from '@/types/owner-profile';

export default function OwnerProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [profile, setProfile] = useState<OwnerProfileFormData>({
    full_name: null,
    phone: null,
    bio: null,
    company_name: null,
    license_number: null,
    years_experience: null,
    specializations: [],
    preferred_contact_method: 'email',
    website: null,
    social_links: {
      facebook: '',
      instagram: '',
      linkedin: ''
    },
    avatar_url: null,
    tax_id: null
  });

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }

      setUser(authUser);

      // Load from profiles_owner table
      const { data: profileData, error } = await supabase
        .from('profiles_owner')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows found" - expected for new users
        console.error('Error loading profile:', error);
      }

      if (profileData) {
        const loaded: OwnerProfileFormData = {
          full_name: profileData.full_name || null,
          phone: profileData.phone || null,
          bio: profileData.bio || null,
          company_name: profileData.company_name || null,
          license_number: profileData.license_number || null,
          years_experience: profileData.years_experience || null,
          specializations: profileData.specializations || [],
          preferred_contact_method: profileData.preferred_contact_method || 'email',
          website: profileData.website || null,
          social_links: profileData.social_links || {
            facebook: '',
            instagram: '',
            linkedin: ''
          },
          avatar_url: profileData.avatar_url || null,
          tax_id: profileData.tax_id || null
        };
        setProfile(loaded);
        setCompletenessScore(profileData.profile_completeness_score || 0);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Calculate completeness score
      const newScore = calculateProfileCompletenessScore(profile);
      setCompletenessScore(newScore);

      // Upsert to profiles_owner table
      const { error } = await supabase
        .from('profiles_owner')
        .upsert({
          id: user.id,
          full_name: profile.full_name ? sanitizeUserInput(profile.full_name, false) : null,
          phone: profile.phone ? sanitizeUserInput(profile.phone, false) : null,
          bio: profile.bio ? sanitizeUserInput(profile.bio, false) : null,
          company_name: profile.company_name ? sanitizeUserInput(profile.company_name, false) : null,
          license_number: profile.license_number ? sanitizeUserInput(profile.license_number, false) : null,
          years_experience: profile.years_experience || null,
          specializations: profile.specializations || [],
          preferred_contact_method: profile.preferred_contact_method || 'email',
          website: profile.website ? sanitizeUserInput(profile.website, false) : null,
          social_links: profile.social_links || { facebook: '', instagram: '', linkedin: '' },
          avatar_url: profile.avatar_url || null,
          tax_id: profile.tax_id || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) throw error;

      alert(`Profile updated successfully! Completeness: ${newScore}%`);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSpecializationToggle = (spec: string) => {
    setProfile(prev => ({
      ...prev,
      specializations: (prev.specializations || []).includes(spec)
        ? (prev.specializations || []).filter(s => s !== spec)
        : [...(prev.specializations || []), spec]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/owner" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Owner Profile</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Overview</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="font-medium">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">💡 Profile Tips</h4>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li>• Complete your profile to build trust with tenants</li>
                  <li>• Add your company info for professional credibility</li>
                  <li>• Include specializations to attract the right tenants</li>
                  <li>• Keep contact info updated for quick communication</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Completeness Score */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Completeness</h3>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Completeness Score</span>
                    <span className="text-sm font-bold text-blue-600">{getCompletenessPercentage(completenessScore)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        completenessScore < 25 ? 'bg-red-500' :
                        completenessScore < 50 ? 'bg-yellow-500' :
                        completenessScore < 75 ? 'bg-blue-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${completenessScore}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600">
                  {getCompletenessLevel(completenessScore) === 'incomplete' && '⚠️ Your profile is incomplete. Fill in more details to build trust with tenants.'}
                  {getCompletenessLevel(completenessScore) === 'partial' && '📝 Your profile is partially complete. Add more details to improve visibility.'}
                  {getCompletenessLevel(completenessScore) === 'good' && '✅ Your profile is looking good! Consider adding more details.'}
                  {getCompletenessLevel(completenessScore) === 'excellent' && '⭐ Excellent! Your profile is complete and compelling.'}
                </p>
              </div>

              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      value={profile.full_name || ''}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value || null })}
                      placeholder="+36 20 123 4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      About Me
                    </label>
                    <textarea
                      id="bio"
                      value={profile.bio || ''}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value || null })}
                      rows={4}
                      placeholder="Tell tenants about yourself and your experience as a property owner..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">This helps tenants understand who they&apos;re dealing with</p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="company_name"
                      value={profile.company_name || ''}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value || null })}
                      placeholder="e.g., Budapest Properties Ltd."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="license_number" className="block text-sm font-medium text-gray-700 mb-1">
                      License Number
                    </label>
                    <input
                      type="text"
                      id="license_number"
                      value={profile.license_number || ''}
                      onChange={(e) => setProfile({ ...profile, license_number: e.target.value || null })}
                      placeholder="Property management license (if applicable)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Years of Experience
                    </label>
                    <select
                      id="years_experience"
                      value={profile.years_experience || ''}
                      onChange={(e) => setProfile({ ...profile, years_experience: (e.target.value as '0-2' | '3-5' | '6-10' | '10+' | null) || null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="0-2">0-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="6-10">6-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={profile.website || ''}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value || null })}
                      placeholder="https://yourwebsite.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Specializations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Specializations</h3>
                <p className="text-sm text-gray-600 mb-4">Select the types of properties you specialize in:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    'Student Housing',
                    'Family Apartments',
                    'Luxury Properties',
                    'Budget Rentals',
                    'Short-term Rentals',
                    'Long-term Leases',
                    'Furnished Apartments',
                    'Pet-friendly Properties'
                  ].map(spec => (
                    <label key={spec} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={(profile.specializations || []).includes(spec)}
                        onChange={() => handleSpecializationToggle(spec)}
                        className="mr-2"
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>

              {/* Contact Preferences */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="preferred_contact" className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Contact Method
                    </label>
                    <select
                      id="preferred_contact"
                      value={profile.preferred_contact_method}
                      onChange={(e) => setProfile({ ...profile, preferred_contact_method: e.target.value as 'email' | 'phone' | 'message' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="message">In-app Messages</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Links</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="facebook" className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      type="url"
                      id="facebook"
                      value={(profile.social_links?.facebook) || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...(profile.social_links || {}), facebook: e.target.value }
                      })}
                      placeholder="https://facebook.com/yourpage"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                      Instagram
                    </label>
                    <input
                      type="url"
                      id="instagram"
                      value={(profile.social_links?.instagram) || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...(profile.social_links || {}), instagram: e.target.value }
                      })}
                      placeholder="https://instagram.com/yourhandle"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="linkedin" className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      id="linkedin"
                      value={(profile.social_links?.linkedin) || ''}
                      onChange={(e) => setProfile({
                        ...profile,
                        social_links: { ...(profile.social_links || {}), linkedin: e.target.value }
                      })}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-4">
                <Link
                  href="/owner"
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}