'use client';

import { useState, useEffect } from 'react';
import { MapPin, Train, ShoppingBag, Footprints } from 'lucide-react';

interface LocationScoreProps {
  lat: number;
  lng: number;
  className?: string;
  compact?: boolean;
}

interface LocationScores {
  walkability: number;
  transit: number;
  amenities: number;
  overall: number;
  nearbyPlaces: Array<{
    name: string;
    type: string;
    distance: number;
    walkTime: number;
  }>;
  transitStops: Array<{
    name: string;
    type: string;
    distance: number;
  }>;
  description: string;
}

export function LocationScore({ lat, lng, className = '', compact = false }: LocationScoreProps) {
  const [scores, setScores] = useState<LocationScores | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchScores() {
      if (!lat || !lng) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/location-score?lat=${lat}&lng=${lng}`);
        const data = await response.json();

        if (data.success) {
          setScores(data.data);
        } else {
          setError(data.error || 'Failed to load scores');
        }
      } catch (err) {
        setError('Failed to fetch location scores');
        console.error('Location score fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, [lat, lng]);

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-100 rounded-lg p-4 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (error || !scores) {
    return null; // Gracefully hide if scores unavailable
  }

  const getScoreBgGradient = (score: number) => {
    if (score >= 70) return 'from-green-500 to-green-600';
    if (score >= 50) return 'from-yellow-500 to-yellow-600';
    return 'from-orange-500 to-orange-600';
  };

  // Compact view for cards
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getScoreBgGradient(scores.overall)} flex items-center justify-center`}>
          <span className="text-sm font-bold text-white">{scores.overall}</span>
        </div>
        <div className="text-sm">
          <span className="font-medium text-gray-900">Location Score</span>
          <p className="text-xs text-gray-500 truncate max-w-[150px]">
            {scores.overall >= 70 ? 'Very Walkable' : scores.overall >= 50 ? 'Walkable' : 'Car Needed'}
          </p>
        </div>
      </div>
    );
  }

  // Full view for detail pages
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-blue-600" />
        Location Score
      </h3>

      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getScoreBgGradient(scores.overall)} flex items-center justify-center shadow-lg`}>
          <span className="text-2xl font-bold text-white">{scores.overall}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{scores.description}</p>
          <p className="text-sm text-gray-500">Based on nearby amenities & transit</p>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <ScoreCard
          icon={<Footprints className="w-4 h-4" />}
          label="Walkability"
          score={scores.walkability}
        />
        <ScoreCard
          icon={<Train className="w-4 h-4" />}
          label="Transit"
          score={scores.transit}
        />
        <ScoreCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Amenities"
          score={scores.amenities}
        />
      </div>

      {/* Nearby Places */}
      {scores.nearbyPlaces.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Nearby Places</h4>
          <div className="space-y-2">
            {scores.nearbyPlaces.slice(0, 5).map((place, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-gray-50 px-3 py-2 rounded-lg">
                <div>
                  <span className="text-gray-800 font-medium">{place.name}</span>
                  <span className="text-gray-400 text-xs ml-2 capitalize">({place.type})</span>
                </div>
                <span className="text-gray-500 text-xs whitespace-nowrap">{place.walkTime} min walk</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transit Stops */}
      {scores.transitStops.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Transit Options</h4>
          <div className="flex flex-wrap gap-2">
            {scores.transitStops.slice(0, 4).map((stop, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
              >
                <Train className="w-3 h-3" />
                {stop.name}
                <span className="text-blue-400">({Math.round(stop.distance)}m)</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 70) return 'bg-green-100 text-green-700 border-green-200';
    if (s >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-orange-100 text-orange-700 border-orange-200';
  };

  return (
    <div className={`rounded-lg p-3 text-center border ${getColor(score)}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-xl font-bold">{score}</div>
      <div className="text-xs opacity-75">{label}</div>
    </div>
  );
}

export default LocationScore;
