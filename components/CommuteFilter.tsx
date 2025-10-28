'use client';

import { useState, useEffect } from 'react';

interface University {
  id: string;
  name: string;
  city: string;
}

export function CommuteFilter({
  apartmentIds,
  onFilterChange,
}: {
  apartmentIds: string[];
  onFilterChange?: (results: Record<string, unknown>) => void;
}) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [modes, setModes] = useState<
    ('transit' | 'walking' | 'bicycling' | 'driving')[]
  >(['transit', 'walking']);
  const [loading, setLoading] = useState(false);
  const [commutes, setCommutes] = useState<Record<string, unknown>>({});

  // Fetch universities
  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const response = await fetch(
          '/api/commute?_endpoint=universities'
        );
        if (response.ok) {
          const data = (await response.json()) as { universities: University[] };
          setUniversities(data.universities || []);
          if (data.universities && data.universities.length > 0) {
            setSelectedUniversity(data.universities[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch universities:', error);
      }
    };

    fetchUniversities();
  }, []);

  // Calculate commutes when selection changes
  useEffect(() => {
    if (!selectedUniversity || apartmentIds.length === 0) return;

    const calculateCommutes = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/commute/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apartmentIds,
            universityIds: [selectedUniversity],
            modes,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as { matrix: Record<string, unknown> };
          setCommutes(data.matrix || {});
          onFilterChange?.(data.matrix);
        }
      } catch (error) {
        console.error('Failed to calculate commutes:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateCommutes();
  }, [selectedUniversity, modes, apartmentIds, onFilterChange]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          University
        </label>
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Select a university...</option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>
              {uni.name} ({uni.city})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Commute Modes
        </label>
        <div className="space-y-2">
          {(
            [
              'transit',
              'walking',
              'bicycling',
              'driving',
            ] as const
          ).map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={modes.includes(mode)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setModes([...modes, mode]);
                  } else {
                    setModes(modes.filter((m) => m !== mode));
                  }
                }}
                className="rounded"
              />
              <span className="text-sm capitalize">{mode}</span>
            </label>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <p className="text-gray-600">Calculating commutes...</p>
        </div>
      )}

      {Object.keys(commutes).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            ✓ Commute times calculated for{' '}
            {Object.keys(commutes).length} apartments
          </p>
        </div>
      )}
    </div>
  );
}
