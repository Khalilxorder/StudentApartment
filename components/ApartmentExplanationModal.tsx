'use client';

import { useEffect } from 'react';
import ExplainWhy, { RecommendationReason } from './ExplainWhy';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  explanation: string;
  apartmentTitle: string;
  matchScore: number;
  reasons?: RecommendationReason[];
};

export default function ApartmentExplanationModal({
  isOpen,
  onClose,
  explanation,
  apartmentTitle,
  matchScore,
  reasons
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const scoreColor = matchScore >= 80 ? 'bg-green-100 border-green-300 text-green-700' : 
                     matchScore >= 50 ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 
                     'bg-orange-100 border-orange-300 text-orange-700';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-start justify-between border-b">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{apartmentTitle}</h2>
            <div className={`inline-block px-4 py-2 rounded-full font-bold text-lg border-2 ${scoreColor}`}>
              {matchScore}% Match
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition ml-4 flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Parse and format the explanation */}
          {explanation.split('\n').map((line, idx) => {
            if (!line.trim()) {
              return <div key={idx} className="h-2" />;
            }

            // Section headers (bold with **)
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <div key={idx} className="text-lg font-bold text-gray-900 mt-4 mb-2">
                  {line.replace(/\*\*/g, '')}
                </div>
              );
            }

            // Bullet points
            if (line.startsWith('•')) {
              return (
                <div key={idx} className="flex gap-3 text-gray-700 ml-2">
                  <span className="text-orange-500 font-bold flex-shrink-0">•</span>
                  <span>{line.substring(1).trim()}</span>
                </div>
              );
            }

            // Checkmarks and scores
            if (line.startsWith('✓') || line.startsWith('○')) {
              const isMatch = line.startsWith('✓');
              return (
                <div key={idx} className={`flex gap-2 text-sm py-1 pl-2 rounded ${
                  isMatch ? 'text-green-700 bg-green-50' : 'text-gray-600 bg-gray-50'
                }`}>
                  <span className={isMatch ? 'text-green-600 font-bold' : 'text-gray-400'}>
                    {isMatch ? '✓' : '○'}
                  </span>
                  <span>{line.substring(1).trim()}</span>
                </div>
              );
            }

            // Regular paragraphs
            return (
              <p key={idx} className="text-gray-700 leading-relaxed">
                {line}
              </p>
            );
          })}

          {reasons && reasons.length > 0 && (
            <ExplainWhy
              reasons={reasons}
              className="border-blue-100 bg-blue-50 shadow-none"
              title="Top reasons this matches"
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 border-t flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
