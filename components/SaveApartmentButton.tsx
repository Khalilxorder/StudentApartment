'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface SaveApartmentButtonProps {
  apartmentId: string;
  initialSaved?: boolean;
  onSaved?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SaveApartmentButton({
  apartmentId,
  initialSaved = false,
  onSaved,
  size = 'md'
}: SaveApartmentButtonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(initialSaved);

  // Sync local state with prop when it changes
  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  const checkOnMount = false; // Disabled by default for performance

  // Check if already saved on mount (only if enabled)
  useEffect(() => {
    if (!checkOnMount || initialSaved) return;

    const checkSavedState = async () => {
      try {
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrf_token='))
          ?.split('=')[1];

        const res = await fetch('/api/favorites', {
          headers: {
            'X-CSRF-Token': csrfToken || '',
          },
        });

        if (res.ok) {
          const data = await res.json();
          setSaved(data.apartmentIds?.includes(apartmentId) || false);
        }
      } catch (err) {
        // Silently fail - user might not be logged in
      }
    };

    checkSavedState();
  }, [apartmentId, checkOnMount, initialSaved]);

  const handleToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;

    setSaving(true);
    setError(null);

    try {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];

      const res = await fetch('/api/favorites', {
        method: saved ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        body: JSON.stringify({ apartmentId }),
      });

      if (res.status === 401) {
        setError('Please sign in to save apartments.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update favorite');
      }

      setSaved(!saved);
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update favorite');
    } finally {
      setSaving(false);
    }
  };

  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      className={`${buttonSizeClasses[size]} rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all group ${saved ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
      title={saved ? 'Remove from saved' : 'Save apartment'}
      aria-label={saved ? 'Remove from saved' : 'Save apartment'}
    >
      <Heart
        className={`${sizeClasses[size]} transition-transform ${saving ? 'animate-pulse' : 'group-hover:scale-110'}`}
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
      {error && (
        <span className="sr-only">{error}</span>
      )}
    </button>
  );
}
