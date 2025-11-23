'use client';

import { useState } from 'react';

interface SaveApartmentButtonProps {
  apartmentId: string;
  onSaved?: () => void;
}

export function SaveApartmentButton({ apartmentId, onSaved }: SaveApartmentButtonProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (saving || saved) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartmentId }),
      });

      if (res.status === 401) {
        setError('Please sign in to save apartments.');
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save apartment');
      }

      setSaved(true);
      onSaved?.();
    } catch (err: any) {
      setError(err.message || 'Failed to save apartment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={`p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm transition-all group ${saved ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
      title={saved ? 'Saved' : 'Save apartment'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-6 h-6 transition-transform ${saving ? 'animate-pulse' : 'group-hover:scale-110'}`}
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
