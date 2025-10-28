'use client';

import { useState } from 'react';

interface VibeSliderProps {
  onChange?: (functional: number, aesthetic: number) => void;
  initialFunctional?: number;
  initialAesthetic?: number;
}

export default function VibeSlider({
  onChange,
  initialFunctional = 0.5,
  initialAesthetic = 0.5
}: VibeSliderProps) {
  const [functional, setFunctional] = useState(initialFunctional);
  const [aesthetic, setAesthetic] = useState(initialAesthetic);

  const handleFunctionalChange = (value: number) => {
    setFunctional(value);
    onChange?.(value, aesthetic);
  };

  const handleAestheticChange = (value: number) => {
    setAesthetic(value);
    onChange?.(functional, value);
  };

  const getPreviewText = () => {
    if (functional > 0.7 && aesthetic > 0.7) {
      return "Balanced: Practical yet stylish spaces";
    } else if (functional > 0.7) {
      return "Practical: Focus on functionality and essentials";
    } else if (aesthetic > 0.7) {
      return "Atmospheric: Emphasis on vibe and aesthetics";
    } else {
      return "Neutral: Standard apartment preferences";
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tune your vibe: practical ↔ atmospheric
      </h3>

      <div className="space-y-6">
        {/* Functional Weight */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              Functional Priority
            </label>
            <span className="text-sm text-gray-500">
              {Math.round(functional * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={functional}
            onChange={(e) => handleFunctionalChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-functional"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Essentials Only</span>
            <span>Full Comfort</span>
          </div>
        </div>

        {/* Aesthetic Weight */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-700">
              Aesthetic Priority
            </label>
            <span className="text-sm text-gray-500">
              {Math.round(aesthetic * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={aesthetic}
            onChange={(e) => handleAestheticChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-aesthetic"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Minimal</span>
            <span>Curated</span>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Preview:</strong> {getPreviewText()}
          </p>
        </div>

        {/* Trade-offs */}
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-orange-800">
            <strong>Trade-offs:</strong> Higher functional weight prioritizes commute and budget; higher aesthetic weight favors atmosphere and design.
          </p>
        </div>
      </div>

      <style jsx>{`
        .slider-functional::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
        }

        .slider-functional::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
        }

        .slider-aesthetic::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ff7a1a;
          cursor: pointer;
        }

        .slider-aesthetic::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ff7a1a;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}