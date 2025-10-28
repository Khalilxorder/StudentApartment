'use client';

import { useEffect, useState } from 'react';

interface DigestPreferences {
  user_id: string;
  frequency: 'daily' | 'weekly' | 'never';
  categories: string[];
  preferred_time: string;
  enabled: boolean;
}

const CATEGORIES = [
  { id: 'new_listings', label: 'New Listings' },
  { id: 'price_drops', label: 'Price Drops' },
  { id: 'saved_searches', label: 'Saved Searches' },
  { id: 'nearby_updates', label: 'Nearby Updates' },
];

export function DigestPreferences({ userId }: { userId: string }) {
  const [preferences, setPreferences] = useState<DigestPreferences>({
    user_id: userId,
    frequency: 'weekly',
    categories: ['new_listings', 'price_drops'],
    preferred_time: '09:00',
    enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch(
          `/api/digests/preferences?userId=${userId}`
        );
        if (response.ok) {
          const data = (await response.json()) as { preferences: DigestPreferences };
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      }
    };

    fetchPreferences();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await fetch('/api/digests/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          frequency: preferences.frequency,
          categories: preferences.categories,
          preferredTime: preferences.preferred_time,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setPreferences((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((c) => c !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Email Digest Settings</h3>

          {/* Frequency Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Digest Frequency
            </label>
            <div className="space-y-2">
              {(['daily', 'weekly', 'never'] as const).map(
                (freq) => (
                  <label
                    key={freq}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={freq}
                      checked={preferences.frequency === freq}
                      onChange={(e) =>
                        setPreferences({
                          ...preferences,
                          frequency: e.target.value as typeof freq,
                          enabled: freq !== 'never',
                        })
                      }
                      className="rounded-full"
                    />
                    <div>
                      <p className="font-medium capitalize">{freq}</p>
                      <p className="text-xs text-gray-600">
                        {freq === 'daily' && 'Every morning'}
                        {freq === 'weekly' && 'Every Monday'}
                        {freq === 'never' && 'Disable digests'}
                      </p>
                    </div>
                  </label>
                )
              )}
            </div>
          </div>

          {/* Categories Selection */}
          {preferences.frequency !== 'never' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What to Include
              </label>
              <div className="space-y-2">
                {CATEGORIES.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={preferences.categories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="rounded"
                    />
                    <span className="font-medium">{category.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Time */}
          {preferences.frequency !== 'never' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Send Time
              </label>
              <input
                type="time"
                value={preferences.preferred_time}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    preferred_time: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-600 mt-1">
                Digests will be sent around this time
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {saved && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">✓ Preferences saved</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 You can manage these settings anytime. Unsubscribe links are
          included in every digest email.
        </p>
      </div>
    </div>
  );
}
