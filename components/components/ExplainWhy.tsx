'use client';

export interface RecommendationReason {
  factor: string;
  weight: number;
  description: string;
}

interface ExplainWhyProps {
  reasons: RecommendationReason[];
  onAdjustPreference?: (factor: string) => void;
  className?: string;
  title?: string;
}

export default function ExplainWhy({ reasons, onAdjustPreference, className, title }: ExplainWhyProps) {
  const topReasons = [...reasons]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  return (
    <div className={`bg-white p-6 rounded-lg shadow-sm border ${className ?? ''}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {title ?? 'Why this is recommended'}
      </h3>

      <div className="space-y-4">
        {topReasons.map((reason, index) => (
          <div key={reason.factor} className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                index === 0 ? 'bg-blue-100 text-blue-800' :
                index === 1 ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {index + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {reason.factor}
              </p>
              <p className="text-sm text-gray-600">
                {reason.description}
              </p>
              {onAdjustPreference && (
                <button
                  onClick={() => onAdjustPreference(reason.factor)}
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                >
                  Adjust preference &rarr;
                </button>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="text-xs text-gray-500">
                {Math.round(reason.weight * 100)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          These recommendations are based on your functional and aesthetic preferences.
          You can adjust your preferences in your profile settings.
        </p>
      </div>
    </div>
  );
}

// Example usage data
export const exampleReasons: RecommendationReason[] = [
  {
    factor: "Quiet block",
    weight: 0.85,
    description: "Located in a residential area with low traffic noise"
  },
  {
    factor: "Under market price",
    weight: 0.72,
    description: "15% below average for similar properties in the district"
  },
  {
    factor: "18 min to BME",
    weight: 0.68,
    description: "Walking distance to Budapest University of Technology"
  },
  {
    factor: "Modern amenities",
    weight: 0.55,
    description: "Recently renovated with updated kitchen and bathroom"
  },
  {
    factor: "Verified owner",
    weight: 0.45,
    description: "Owner has completed identity verification and has positive reviews"
  }
];




