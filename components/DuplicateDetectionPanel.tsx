'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Copy, Trash2, RefreshCw, CheckCircle } from 'lucide-react';
import type { DuplicateMatch } from '@/services/duplicate-detection-svc';

interface DuplicateDetectionProps {
  apartmentId: string;
  onClose?: () => void;
}

interface DuplicateResult {
  apartmentId: string;
  matches: DuplicateMatch[];
  detectionMethod: 'full_scan' | 'incremental' | 'manual';
  totalMatches: number;
  highestMatchScore: number;
  completedAt: string;
}

export function DuplicateDetectionPanel({ apartmentId, onClose }: DuplicateDetectionProps) {
  const [duplicates, setDuplicates] = useState<DuplicateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set());

  useEffect(() => {
    const detectDuplicates = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/moderation/duplicates?apartmentId=${apartmentId}&method=incremental`
        );

        if (!response.ok) {
          throw new Error('Failed to detect duplicates');
        }

        const data = await response.json();
        setDuplicates(data.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    detectDuplicates();
  }, [apartmentId]);

  const handleMarkDuplicate = async (duplicateId: string) => {
    try {
      setMarking(true);

      const response = await fetch('/api/moderation/duplicates/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalApartmentId: apartmentId,
          duplicateApartmentId: duplicateId,
          score: duplicates?.matches.find(m => m.candidateId === duplicateId)?.totalScore || 0.5,
          method: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark duplicate');
      }

      // Remove from list
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          matches: duplicates.matches.filter(m => m.candidateId !== duplicateId),
          totalMatches: Math.max(0, duplicates.totalMatches - 1),
        });
      }

      setSelectedDuplicates(prev => {
        const updated = new Set(prev);
        updated.delete(duplicateId);
        return updated;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark duplicate';
      setError(message);
    } finally {
      setMarking(false);
    }
  };

  const handleRemoveDuplicate = async (duplicateId: string) => {
    try {
      setMarking(true);

      const response = await fetch(
        `/api/moderation/duplicates?canonicalApartmentId=${apartmentId}&duplicateApartmentId=${duplicateId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove duplicate');
      }

      // Remove from list
      if (duplicates) {
        setDuplicates({
          ...duplicates,
          matches: duplicates.matches.filter(m => m.candidateId !== duplicateId),
          totalMatches: Math.max(0, duplicates.totalMatches - 1),
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove duplicate';
      setError(message);
    } finally {
      setMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          <p className="text-gray-600">Detecting duplicates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!duplicates || duplicates.matches.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700">No potential duplicates detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Potential Duplicates</h3>
          <p className="text-sm text-gray-600">
            Found {duplicates.totalMatches} potential duplicate{duplicates.totalMatches !== 1 ? 's' : ''}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-3">
        {duplicates.matches.map(match => (
          <div
            key={match.candidateId}
            className="border rounded-lg p-4 hover:bg-gray-50 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-800">{match.candidateId}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    match.confidence === 'high'
                      ? 'bg-red-100 text-red-800'
                      : match.confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {match.confidence} confidence
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Similarity Score: <span className="font-mono font-semibold">{(match.totalScore * 100).toFixed(1)}%</span>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleMarkDuplicate(match.candidateId)}
                  disabled={marking}
                  className="p-2 hover:bg-green-100 rounded-lg transition disabled:opacity-50"
                  title="Mark as duplicate"
                >
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </button>
                <button
                  onClick={() => handleRemoveDuplicate(match.candidateId)}
                  disabled={marking}
                  className="p-2 hover:bg-red-100 rounded-lg transition disabled:opacity-50"
                  title="Dismiss this match"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <ScoreBar label="Address" score={match.scoreBreakdown.addressScore} />
              <ScoreBar label="Title" score={match.scoreBreakdown.titleScore} />
              <ScoreBar label="Location" score={match.scoreBreakdown.geoScore} />
              <ScoreBar label="Description" score={match.scoreBreakdown.descriptionScore} />
              <ScoreBar label="Amenities" score={match.scoreBreakdown.amenityScore} />
              <ScoreBar label="Owner" score={match.scoreBreakdown.ownerScore} />
            </div>

            {match.evidenceItems.length > 0 && (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Evidence:</p>
                <ul className="space-y-1">
                  {match.evidenceItems.map((item, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mini score bar component for visual representation
 */
function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600">{label}</label>
        <span className="text-xs font-mono text-gray-600">
          {(score * 100).toFixed(0)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            score >= 0.7
              ? 'bg-red-500'
              : score >= 0.5
              ? 'bg-yellow-500'
              : score >= 0.3
              ? 'bg-blue-500'
              : 'bg-gray-300'
          }`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}
