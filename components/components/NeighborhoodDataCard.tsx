// FILE: components/NeighborhoodDataCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { MapPin, Car, Bike, Train, Shield, ShoppingBag, Coffee, Utensils, Dumbbell, Trees, GraduationCap, Hospital } from 'lucide-react';

type NeighborhoodData = {
  walkScore?: {
    score: number;
    description: string;
    updated: string;
  };
  transitScore?: {
    score: number;
    description: string;
    summary: string;
  };
  bikeScore?: {
    score: number;
    description: string;
  };
  nearbyAmenities: {
    restaurants: number;
    grocery: number;
    shopping: number;
    cafes: number;
    gyms: number;
    parks: number;
    schools: number;
    hospitals: number;
  };
  safety?: {
    score: number;
    description: string;
  };
  priceTrends?: {
    averagePrice: number;
    trend: 'up' | 'down' | 'stable';
    changePercent: number;
  };
};

type NeighborhoodDataCardProps = {
  latitude: number;
  longitude: number;
  address?: string;
};

export default function NeighborhoodDataCard({ latitude, longitude, address }: NeighborhoodDataCardProps) {
  const [data, setData] = useState<NeighborhoodData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNeighborhoodData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/neighborhood', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude,
            longitude,
            address,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch neighborhood data');
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Error fetching neighborhood data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load neighborhood data');
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchNeighborhoodData();
    }
  }, [latitude, longitude, address]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500">
          <MapPin className="mx-auto h-12 w-12 mb-4" />
          <p>Unable to load neighborhood data</p>
          <p className="text-sm text-gray-400 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-6 flex items-center">
        <MapPin className="h-6 w-6 mr-2 text-blue-600" />
        Neighborhood Insights
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Walk Score */}
        {data.walkScore && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Walk Score</span>
              <span className="text-2xl">{getScoreIcon(data.walkScore.score)}</span>
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(data.walkScore.score)}`}>
              {data.walkScore.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">{data.walkScore.description}</p>
          </div>
        )}

        {/* Transit Score */}
        {data.transitScore && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 flex items-center">
                <Train className="h-4 w-4 mr-1" />
                Transit Score
              </span>
              <span className="text-2xl">{getScoreIcon(data.transitScore.score)}</span>
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(data.transitScore.score)}`}>
              {data.transitScore.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">{data.transitScore.description}</p>
          </div>
        )}

        {/* Bike Score */}
        {data.bikeScore && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 flex items-center">
                <Bike className="h-4 w-4 mr-1" />
                Bike Score
              </span>
              <span className="text-2xl">{getScoreIcon(data.bikeScore.score)}</span>
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(data.bikeScore.score)}`}>
              {data.bikeScore.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">{data.bikeScore.description}</p>
          </div>
        )}

        {/* Safety Score */}
        {data.safety && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 flex items-center">
                <Shield className="h-4 w-4 mr-1" />
                Safety
              </span>
              <span className="text-2xl">{getScoreIcon(data.safety.score)}</span>
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(data.safety.score)}`}>
              {data.safety.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">{data.safety.description}</p>
          </div>
        )}
      </div>

      {/* Nearby Amenities */}
      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-4">Nearby Amenities (within 1.5km)</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <Utensils className="h-5 w-5 text-orange-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.restaurants}</span> Restaurants
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-blue-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.grocery}</span> Grocery Stores
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Coffee className="h-5 w-5 text-amber-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.cafes}</span> Cafes
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-green-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.gyms}</span> Gyms
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Trees className="h-5 w-5 text-green-600" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.parks}</span> Parks
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <GraduationCap className="h-5 w-5 text-purple-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.schools}</span> Schools
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Hospital className="h-5 w-5 text-red-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.hospitals}</span> Hospitals
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            <span className="text-sm">
              <span className="font-semibold">{data.nearbyAmenities.shopping}</span> Shopping Centers
            </span>
          </div>
        </div>
      </div>

      {/* Price Trends */}
      {data.priceTrends && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold mb-4">Price Trends</h4>
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-sm text-gray-600">Average Price</span>
              <div className="text-2xl font-bold text-gray-900">
                €{data.priceTrends.averagePrice.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Trend</span>
              <div className={`text-lg font-semibold ${
                data.priceTrends.trend === 'up' ? 'text-red-600' :
                data.priceTrends.trend === 'down' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {data.priceTrends.trend === 'up' ? '↗️ Rising' :
                 data.priceTrends.trend === 'down' ? '↘️ Falling' : '➡️ Stable'}
                ({data.priceTrends.changePercent > 0 ? '+' : ''}{data.priceTrends.changePercent}%)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}