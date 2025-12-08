'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface PricingRecommendation {
  apartment_id: string;
  current_price: number;
  recommended_price: number;
  confidence_score: number;
  factors: {
    location_score: number;
    demand_score: number;
    seasonality_multiplier: number;
    competitor_adjustment: number;
    amenities_score: number;
    condition_score: number;
  };
  expected_occupancy: number;
  revenue_impact: number;
}

interface Apartment {
  id: string;
  title: string;
  price_huf: number;
  district: number;
  bedrooms: number;
  bathrooms: number;
}

export default function PricingDashboard() {
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApartment, setSelectedApartment] = useState<string | null>(null);
  const [updatingPrice, setUpdatingPrice] = useState<string | null>(null);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    setLoading(true);
    try {
      // Load user's apartments
      const { data: userApartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('id, title, price_huf, district, bedrooms, bathrooms')
        .eq('owner_id', (await supabase.auth.getUser()).data.user?.id);

      if (apartmentsError) {
        console.error('Error loading apartments:', apartmentsError);
        return;
      }

      setApartments(userApartments || []);

      // Load pricing recommendations for all apartments
      const { data: pricingData, error: pricingError } = await supabase
        .functions.invoke('get-pricing-recommendations');

      if (pricingError) {
        console.error('Error loading pricing data:', pricingError);
        // Fallback to API call
        const response = await fetch('/api/pricing');
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        }
      } else {
        setRecommendations(pricingData?.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading pricing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPriceRecommendation = async (apartmentId: string, newPrice: number) => {
    setUpdatingPrice(apartmentId);
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartment_id: apartmentId,
          new_price: newPrice,
          reason: 'Applied AI pricing recommendation',
        }),
      });

      if (response.ok) {
        await loadPricingData(); // Refresh data
      } else {
        console.error('Failed to update price');
      }
    } catch (error) {
      console.error('Error updating price:', error);
    } finally {
      setUpdatingPrice(null);
    }
  };

  const getRecommendationForApartment = (apartmentId: string) => {
    return recommendations.find(rec => rec.apartment_id === apartmentId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRevenueImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600';
    if (impact < -5000) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-bold text-gray-900">Pricing Optimization</h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered pricing recommendations to maximize your revenue
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {apartments.map((apartment) => {
            const recommendation = getRecommendationForApartment(apartment.id);

            return (
              <div key={apartment.id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{apartment.title}</h3>
                      <p className="text-sm text-gray-600">
                        District {apartment.district} • {apartment.bedrooms} bed • {apartment.bathrooms} bath
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(apartment.price_huf)}
                      </div>
                      <div className="text-sm text-gray-500">Current price</div>
                    </div>
                  </div>
                </div>

                {recommendation && (
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Recommendation */}
                      <div className="bg-indigo-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-indigo-900 mb-2">AI Recommendation</h4>
                        <div className="text-2xl font-bold text-indigo-600 mb-1">
                          {formatCurrency(recommendation.recommended_price)}
                        </div>
                        <div className="text-sm text-indigo-700 mb-2">
                          Confidence: <span className={getConfidenceColor(recommendation.confidence_score)}>
                            {Math.round(recommendation.confidence_score * 100)}%
                          </span>
                        </div>
                        <div className="text-sm text-indigo-700">
                          Expected occupancy: {Math.round(recommendation.expected_occupancy * 100)}%
                        </div>
                      </div>

                      {/* Revenue Impact */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-900 mb-2">Revenue Impact</h4>
                        <div className={`text-2xl font-bold mb-1 ${getRevenueImpactColor(recommendation.revenue_impact)}`}>
                          {recommendation.revenue_impact > 0 ? '+' : ''}
                          {formatCurrency(recommendation.revenue_impact)}
                        </div>
                        <div className="text-sm text-green-700">Monthly estimate</div>
                      </div>

                      {/* Key Factors */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Key Factors</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Location:</span>
                            <span className="font-medium">{Math.round(recommendation.factors.location_score * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Demand:</span>
                            <span className="font-medium">{Math.round(recommendation.factors.demand_score * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Seasonality:</span>
                            <span className="font-medium">{Math.round(recommendation.factors.seasonality_multiplier * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 flex space-x-4">
                      <button
                        onClick={() => applyPriceRecommendation(apartment.id, recommendation.recommended_price)}
                        disabled={updatingPrice === apartment.id}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {updatingPrice === apartment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : null}
                        Apply Recommendation
                      </button>
                      <button
                        onClick={() => setSelectedApartment(selectedApartment === apartment.id ? null : apartment.id)}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        {selectedApartment === apartment.id ? 'Hide' : 'View'} Details
                      </button>
                    </div>

                    {/* Detailed Factors */}
                    {selectedApartment === apartment.id && (
                      <div className="mt-6 border-t border-gray-200 pt-6">
                        <h4 className="text-lg font-medium text-gray-900 mb-4">Detailed Analysis</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Pricing Factors</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Location Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-indigo-600 h-2 rounded-full"
                                      style={{ width: `${recommendation.factors.location_score * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{Math.round(recommendation.factors.location_score * 100)}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Demand Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-green-600 h-2 rounded-full"
                                      style={{ width: `${recommendation.factors.demand_score * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{Math.round(recommendation.factors.demand_score * 100)}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Amenities Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${recommendation.factors.amenities_score * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{Math.round(recommendation.factors.amenities_score * 100)}%</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Condition Score</span>
                                <div className="flex items-center space-x-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-yellow-600 h-2 rounded-full"
                                      style={{ width: `${recommendation.factors.condition_score * 100}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{Math.round(recommendation.factors.condition_score * 100)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-3">Market Adjustments</h5>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Seasonality</span>
                                <span className={`text-sm font-medium ${
                                  recommendation.factors.seasonality_multiplier > 1 ? 'text-green-600' :
                                  recommendation.factors.seasonality_multiplier < 1 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {recommendation.factors.seasonality_multiplier > 1 ? '+' : ''}
                                  {Math.round((recommendation.factors.seasonality_multiplier - 1) * 100)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">vs Competitors</span>
                                <span className={`text-sm font-medium ${
                                  recommendation.factors.competitor_adjustment > 1 ? 'text-green-600' :
                                  recommendation.factors.competitor_adjustment < 1 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {recommendation.factors.competitor_adjustment > 1 ? '+' : ''}
                                  {Math.round((recommendation.factors.competitor_adjustment - 1) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!recommendation && (
                  <div className="px-6 py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Pricing</h3>
                    <p className="text-gray-600">AI recommendations will be available soon based on market data.</p>
                  </div>
                )}
              </div>
            );
          })}

          {apartments.length === 0 && (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Apartments Found</h3>
              <p className="text-gray-600">Add apartments to your account to see pricing recommendations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}