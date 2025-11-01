// FILE: components/WhyThisModal.tsx
// Modal showing detailed reasoning for why an apartment was recommended

import React, { useState } from 'react';
import type { SearchOrigin } from './SearchOriginBadge';

interface Reason {
  factor: string;
  description: string;
  weight?: number;
}

interface WhyThisModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartmentTitle: string;
  score: number;
  origin: SearchOrigin;
  reasons: Reason[];
  aiReasons?: string[];
  onFeedback?: (helpful: boolean) => void;
}

export function WhyThisModal({
  isOpen,
  onClose,
  apartmentTitle,
  score,
  origin,
  reasons = [],
  aiReasons = [],
  onFeedback
}: WhyThisModalProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback?.(helpful);
    setTimeout(() => {
      setFeedbackGiven(null);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const originLabels: Record<SearchOrigin, string> = {
    'structured': 'Structured Search',
    'semantic': 'Semantic Understanding',
    'ai-scored': 'AI Personalization',
    'keyword': 'Text Matching',
    'fallback': 'Fallback Search'
  };

  const originDescriptions: Record<SearchOrigin, string> = {
    'structured': 'This apartment matches your filter criteria (price, location, amenities, etc.)',
    'semantic': 'Our AI understood the natural language meaning of your search and found relevant properties',
    'ai-scored': 'This apartment was ranked higher based on AI analysis of your preferences and profile',
    'keyword': 'This apartment matched keywords from your search query',
    'fallback': 'This apartment was found using our fallback search method'
  };

  const displayReasons = aiReasons.length > 0 ? aiReasons : reasons.map(r => r.description);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Why This Apartment?</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{apartmentTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Match Score */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">Match Score</span>
              <span className="text-2xl font-bold text-orange-500">{Math.round(score)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            </div>
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">How We Found It</span>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="font-medium text-blue-900 mb-1">{originLabels[origin]}</div>
              <p className="text-sm text-blue-700">{originDescriptions[origin]}</p>
            </div>
          </div>

          {/* Reasons */}
          {displayReasons.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">
                Top Reasons ({displayReasons.length})
              </span>
              <ul className="space-y-2">
                {displayReasons.slice(0, 3).map((reason, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700 pt-0.5">
                      {typeof reason === 'string' ? reason : reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Explanation */}
          {aiReasons.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-semibold text-gray-700">AI Analysis</span>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-900">
                <p>This apartment was analyzed by our AI personalization engine and ranked based on your profile and preferences.</p>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="pt-4 border-t space-y-2">
            <span className="text-sm font-semibold text-gray-700">Was this helpful?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(true)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  feedbackGiven === true
                    ? 'bg-green-500 text-white'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                {feedbackGiven === true ? '✓ Thanks!' : '👍 Yes'}
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  feedbackGiven === false
                    ? 'bg-red-500 text-white'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                {feedbackGiven === false ? '✓ Got it' : '👎 No'}
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center">Help us improve recommendations</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhyThisModal;
