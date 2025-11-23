'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabaseClient';
import { sanitizeUserInput } from '@/lib/sanitize';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    bio: '',
    occupation: '',
    university: '',
    age: '',
    preferences: {
      quietPreference: '',
      petsOwned: '',
      smokingHabits: '',
    },
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          bio: profileData.bio || '',
          occupation: profileData.occupation || '',
          university: profileData.university || '',
          age: profileData.age?.toString() || '',
          preferences: profileData.preferences || {
            quietPreference: '',
            petsOwned: '',
            smokingHabits: '',
          },
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: sanitizeUserInput(profile.full_name, false),
          phone: sanitizeUserInput(profile.phone, false),
          bio: sanitizeUserInput(profile.bio, false),
          university: sanitizeUserInput(profile.university, false),
          age: profile.age ? parseInt(profile.age) : null,
          preferences: profile.preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Error updating profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('New password must be at least 8 characters long!');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      // Clear the form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      alert('Password changed successfully!');
    } catch (error: any) {
      console.error('Error changing password:', error);
      alert('Error changing password: ' + error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">Manage your personal information</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="w-24 h-24 bg-yellow-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-3xl font-bold text-yellow-600">
                    {profile.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {profile.full_name || 'User'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{user?.email}</p>

                {/* Stats */}
                <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Member since</span>
                    <span className="font-medium text-gray-900">
                      {new Date(user?.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Assessment Connection */}
            <div className="mt-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">🎯 Personality Assessment</h3>
              <p className="text-xs text-gray-600 mb-3">
                Connect your personality profile for better apartment recommendations
              </p>
              
              {/* Show current assessment status */}
              {(() => {
                // Check if assessment exists (in a real app, this would be fetched)
                const hasAssessment = false; // This would be checked from state/API
                return hasAssessment ? (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-xs text-green-800 font-medium">✓ Connected</p>
                    <p className="text-xs text-green-600">Archetype: Creative Explorer</p>
                  </div>
                ) : null;
              })()}

              <button 
                onClick={async () => {
                  try {
                    const { openPersonalityAssessmentPopup, getPersonalityAssessment } = await import('../../../utils/personality-assessment');
                    
                    // Check if already connected
                    const existing = await getPersonalityAssessment(user.id);
                    if (existing) {
                      alert(`Already connected! Your archetype: ${existing.archetype || 'Balanced Individual'}`);
                      return;
                    }

                    // For demo purposes, simulate successful connection
                    // In production, this would open the popup
                    alert('In production, this would open the SELF ASSESSMENT BATTERY website in a popup. For demo purposes, we\'ll simulate a successful connection.');
                    
                    // Simulate assessment completion
                    const mockAssessment = {
                      archetype: 'Creative Explorer',
                      traits: { openness: 0.8, conscientiousness: 0.5, extraversion: 0.6, agreeableness: 0.7, neuroticism: 0.3 }
                    };
                    
                    alert(`Personality assessment completed! Your archetype: ${mockAssessment.archetype}`);
                    
                  } catch (err) {
                    console.error('Personality assessment error:', err);
                    alert('Connection failed. Please try again.');
                  }
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition"
              >
                Take Assessment
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Uses SELF ASSESSMENT BATTERY
              </p>
            </div>

            {/* Tips */}
            <div className="mt-6 bg-yellow-50 rounded-lg border border-yellow-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 Profile Tips</h3>
              <ul className="space-y-2 text-xs text-gray-600">
                <li>• Complete your profile to help landlords understand you better</li>
                <li>• Add your university to find apartments near campus</li>
                <li>• Keep your phone number updated for quick contact</li>
              </ul>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+36 20 123 4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                      min="18"
                      max="100"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                      About Me
                    </label>
                    <textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      rows={4}
                      placeholder="Tell landlords a bit about yourself..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">This helps landlords understand who you are</p>
                  </div>
                </div>
              </div>

              {/* Student Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student/Work Information</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="occupation" className="block text-sm font-medium text-gray-700 mb-1">
                      Occupation
                    </label>
                    <select
                      id="occupation"
                      value={profile.occupation}
                      onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="student">Student</option>
                      <option value="professional">Professional</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="researcher">Researcher</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">
                      University / Company
                    </label>
                    <input
                      type="text"
                      id="university"
                      value={profile.university}
                      onChange={(e) => setProfile({ ...profile, university: e.target.value })}
                      placeholder="e.g., ELTE, BME, Corvinus..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Living Preferences</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="quietPreference" className="block text-sm font-medium text-gray-700 mb-1">
                      Lifestyle Preference
                    </label>
                    <select
                      id="quietPreference"
                      value={profile.preferences.quietPreference}
                      onChange={(e) => setProfile({
                        ...profile,
                        preferences: { ...profile.preferences, quietPreference: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="very-quiet">Very Quiet (study-focused)</option>
                      <option value="moderate">Moderate</option>
                      <option value="social">Social & Active</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="petsOwned" className="block text-sm font-medium text-gray-700 mb-1">
                      Do you have pets?
                    </label>
                    <select
                      id="petsOwned"
                      value={profile.preferences.petsOwned}
                      onChange={(e) => setProfile({
                        ...profile,
                        preferences: { ...profile.preferences, petsOwned: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="none">No pets</option>
                      <option value="cat">Cat</option>
                      <option value="dog">Dog</option>
                      <option value="both">Both cat and dog</option>
                      <option value="other">Other pets</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="smokingHabits" className="block text-sm font-medium text-gray-700 mb-1">
                      Smoking Habits
                    </label>
                    <select
                      id="smokingHabits"
                      value={profile.preferences.smokingHabits}
                      onChange={(e) => setProfile({
                        ...profile,
                        preferences: { ...profile.preferences, smokingHabits: e.target.value }
                      })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="">Select...</option>
                      <option value="non-smoker">Non-smoker</option>
                      <option value="social-smoker">Social smoker</option>
                      <option value="smoker">Regular smoker</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Security Settings */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Enter your current password"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Enter your new password"
                    />
                    <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Confirm your new password"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                    className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {changingPassword ? 'Changing Password...' : 'Change Password'}
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
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
