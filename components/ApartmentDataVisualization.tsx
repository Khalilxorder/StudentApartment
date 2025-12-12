'use client';

import React from 'react';

interface ApartmentDataVisualizationProps {
  price: number;
  sizeSqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorNumber?: number;
  district?: number;
  minimal?: boolean;
}

export default function ApartmentDataVisualization({
  price,
  sizeSqm,
  bedrooms = 0,
  bathrooms = 0,
  floorNumber,
  district,
  minimal = false
}: ApartmentDataVisualizationProps) {
  // Calculate price per square meter if size is available
  const pricePerSqm = sizeSqm ? Math.round(price / sizeSqm) : null;

  // Mock data for comparison (in a real app, this would come from an API)
  const districtAvgPrice = district ? 150000 + (district * 5000) : 150000;
  const districtAvgPricePerSqm = district ? 1200 + (district * 50) : 1200;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Property Analytics</h3>
      </div>

      <div className={`grid ${minimal ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-6`}>
        {/* Price Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Price Analysis</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Price</span>
              <span className="font-semibold text-gray-900">{price.toLocaleString()} Ft</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">District Average</span>
              <span className="font-semibold text-gray-900">{districtAvgPrice.toLocaleString()} Ft</span>
            </div>
            {pricePerSqm && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Price/m²</span>
                <span className="font-semibold text-gray-900">{pricePerSqm.toLocaleString()} Ft</span>
              </div>
            )}
            {pricePerSqm && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">District Avg/m²</span>
                <span className="font-semibold text-gray-900">{districtAvgPricePerSqm.toLocaleString()} Ft</span>
              </div>
            )}
          </div>

          {/* Simple price comparison bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>District Average</span>
              <span>This Property</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full">
              <div
                className="absolute left-0 top-0 h-2 bg-blue-500 rounded-full"
                style={{ width: `${Math.min((districtAvgPrice / price) * 100, 100)}%` }}
              ></div>
              <div
                className="absolute top-0 h-2 bg-orange-500 rounded-full"
                style={{
                  left: `${Math.min((districtAvgPrice / price) * 100, 95)}%`,
                  width: '5%'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Property Features Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Property Features</h4>
          <div className="space-y-3">
            {sizeSqm && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Size</span>
                <span className="font-semibold text-gray-900">{sizeSqm} m²</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bedrooms</span>
              <span className="font-semibold text-gray-900">{bedrooms}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Bathrooms</span>
              <span className="font-semibold text-gray-900">{bathrooms}</span>
            </div>
            {floorNumber && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Floor</span>
                <span className="font-semibold text-gray-900">{floorNumber}</span>
              </div>
            )}
            {district && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">District</span>
                <span className="font-semibold text-gray-900">{district}</span>
              </div>
            )}
          </div>

          {/* Simple feature score visualization */}
          <div className="mt-4">
            <div className="text-xs text-gray-500 mb-2">Feature Completeness</div>
            <div className="flex gap-1">
              {[(bedrooms ?? 0) > 0, (bathrooms ?? 0) > 0, (sizeSqm ?? 0) > 0, (floorNumber ?? 0) > 0].map((hasFeature, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${hasFeature ? 'bg-green-500' : 'bg-gray-300'}`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Basic</span>
              <span>Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Market Position Summary */}
      {!minimal && (
        <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Market Position</h4>
              <p className="text-sm text-gray-700">
                {price < districtAvgPrice * 0.9
                  ? "This property is priced below the district average, representing good value."
                  : price > districtAvgPrice * 1.1
                    ? "This property is priced above the district average, indicating premium positioning."
                    : "This property is priced in line with the district average."
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}