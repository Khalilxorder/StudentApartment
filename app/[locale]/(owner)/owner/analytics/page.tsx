'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: number;
  avgRevenuePerBooking: number;
  avgRevenuePerListing: number;
  conversionRate: number;
  totalListings: number;
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  apartmentStats: Array<{
    id: string;
    title: string;
    district: string;
    views: number;
    inquiries: number;
    bookings: number;
    activeBookings: number;
    revenue: number;
    occupancyRate: number;
  }>;
}

interface PeriodComparison {
  currentRevenue: number;
  previousRevenue: number;
  currentBookings: number;
  previousBookings: number;
  currentConversionRate: number;
  previousConversionRate: number;
}

export default function OwnerAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    avgRevenuePerBooking: 0,
    avgRevenuePerListing: 0,
    conversionRate: 0,
    totalListings: 0,
    totalBookings: 0,
    activeBookings: 0,
    pendingBookings: 0,
    apartmentStats: [],
  });
  const [comparison, setComparison] = useState<PeriodComparison>({
    currentRevenue: 0,
    previousRevenue: 0,
    currentBookings: 0,
    previousBookings: 0,
    currentConversionRate: 0,
    previousConversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range state
  const [dateRange, setDateRange] = useState<'all' | 'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let startDate: Date;
      let endDate = new Date();
      endDate.setHours(23, 59, 59, 999);

      // Calculate start date based on selection
      if (dateRange === 'custom') {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        switch (dateRange) {
          case 'month':
            startDate.setDate(1);
            break;
          case 'quarter':
            const quarter = Math.floor(startDate.getMonth() / 3);
            startDate.setMonth(quarter * 3, 1);
            break;
          case 'year':
            startDate.setMonth(0, 1);
            break;
        }
      }

      const response = await fetch(
        `/api/owner/analytics/detailed?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to load analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setComparison(data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Calculate percentage change
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const revenueChange = calculateChange(comparison.currentRevenue, comparison.previousRevenue);
  const bookingsChange = calculateChange(comparison.currentBookings, comparison.previousBookings);
  const conversionChange = comparison.previousConversionRate > 0
    ? comparison.currentConversionRate - comparison.previousConversionRate
    : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Link removed */}
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-sm text-red-700">⚠️ {error}</p>
            <button
              onClick={loadAnalytics}
              className="text-sm text-red-600 hover:text-red-700 mt-2 font-medium underline"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Link removed */}
              <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as 'all' | 'month' | 'quarter' | 'year' | 'custom')}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Time</option>
                <option value="year">This Year</option>
                <option value="quarter">This Quarter</option>
                <option value="month">This Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Cards with Period Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {analytics.totalRevenue.toLocaleString()} HUF
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                {comparison.previousRevenue > 0 && (
                  <p className={`text-sm mt-2 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueChange > 0 ? '↑' : '↓'} {Math.abs(revenueChange)}% vs previous period
                  </p>
                )}
              </>
            )}
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Current Period Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {comparison.currentRevenue.toLocaleString()} HUF
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                {comparison.previousRevenue > 0 && (
                  <p className={`text-sm mt-2 ${revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Prev: {comparison.previousRevenue.toLocaleString()} HUF
                  </p>
                )}
              </>
            )}
          </div>

          {/* Avg per Booking */}
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg per Booking</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {Math.round(analytics.avgRevenuePerBooking).toLocaleString()} HUF
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Conversion Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-32"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {analytics.conversionRate}%
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-full">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                {comparison.previousConversionRate > 0 && (
                  <p className={`text-sm mt-2 ${conversionChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {conversionChange > 0 ? '↑' : '↓'} {Math.abs(conversionChange).toFixed(1)}% vs previous
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Performance by Apartment */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Performance by Listing</h2>
          </div>
          {loading ? (
            <div className="px-6 py-8">
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inquiries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conversion
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.apartmentStats.map((apartment) => (
                    <tr key={apartment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{apartment.title}</div>
                          <div className="text-sm text-gray-500">District {apartment.district}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apartment.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apartment.inquiries}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apartment.activeBookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {apartment.revenue.toLocaleString()} HUF
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${apartment.occupancyRate >= 75
                          ? 'bg-green-100 text-green-800'
                          : apartment.occupancyRate >= 50
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                          }`}>
                          {Math.round(apartment.occupancyRate)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Booking Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Status Overview</h3>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Approved Bookings</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${analytics.totalBookings > 0
                            ? (analytics.activeBookings / analytics.totalBookings) * 100
                            : 0
                            }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{analytics.activeBookings}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Requests</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{
                          width: `${analytics.totalBookings > 0
                            ? (analytics.pendingBookings / analytics.totalBookings) * 100
                            : 0
                            }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{analytics.pendingBookings}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Rejected/Cancelled</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${analytics.totalBookings > 0
                            ? ((analytics.totalBookings -
                              analytics.activeBookings -
                              analytics.pendingBookings) /
                              analytics.totalBookings) *
                            100
                            : 0
                            }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {analytics.totalBookings -
                        analytics.activeBookings -
                        analytics.pendingBookings}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Insights</h3>
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-6 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Portfolio Value</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.apartmentStats
                      .reduce((sum, apt) => sum + apt.revenue, 0)
                      .toLocaleString()} HUF
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Revenue per Listing</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(analytics.avgRevenuePerListing).toLocaleString()} HUF
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Top Performing Listing</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.apartmentStats.length > 0
                      ? analytics.apartmentStats.reduce((prev, current) =>
                        prev.revenue > current.revenue ? prev : current
                      ).title
                      : 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Occupancy Rate</span>
                  <span className="text-sm font-medium text-gray-900">
                    {analytics.totalListings > 0
                      ? Math.round((analytics.activeBookings / analytics.totalListings) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
