'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabaseClient';

interface AnalyticsData {
  totalUsers: number;
  totalApartments: number;
  totalBookings: number;
  monthlyRevenue: number;
  userGrowth: number;
  bookingConversion: number;
  topDistricts: Array<{ district: string; count: number }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const supabase = createClient();

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Get total counts
      const [
        { count: totalUsers },
        { count: totalApartments },
        { count: totalBookings },
        { data: revenueData },
        { data: userGrowth },
        { data: topDistricts },
        { data: recentActivity }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('apartments').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('payment_transactions').select('amount_huf').eq('status', 'succeeded'),
        supabase.from('profiles').select('created_at'),
        supabase.from('apartments').select('district').eq('is_available', true),
        supabase.from('bookings').select('created_at, status').order('created_at', { ascending: false }).limit(10)
      ]);

      // Calculate monthly revenue
      const monthlyRevenue = revenueData?.reduce((sum: number, tx: any) => sum + (tx.amount_huf || 0), 0) || 0;

      // Calculate user growth (simplified)
      const userGrowthRate = userGrowth ? Math.round((userGrowth.length / 30) * 100) / 100 : 0;

      // Calculate booking conversion
      const bookingConversion = totalApartments && totalBookings
        ? Math.round((totalBookings / (totalApartments * 10)) * 100) / 100
        : 0;

      // Get top districts
      const districtCounts = topDistricts?.reduce((acc: any, apt: any) => {
        acc[apt.district] = (acc[apt.district] || 0) + 1;
        return acc;
      }, {} as Record<number, number>) || {};

      const topDistrictsArray = Object.entries(districtCounts)
        .map(([district, count]) => ({ district: `District ${district}`, count: count as number }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 5);

      // Format recent activity
      const recentActivityFormatted = recentActivity?.map((activity: any) => ({
        type: activity.status === 'approved' ? 'booking' : 'application',
        description: `New ${activity.status} booking`,
        timestamp: new Date(activity.created_at).toLocaleDateString()
      })) || [];

      setData({
        totalUsers: totalUsers || 0,
        totalApartments: totalApartments || 0,
        totalBookings: totalBookings || 0,
        monthlyRevenue,
        userGrowth: userGrowthRate,
        bookingConversion,
        topDistricts: topDistrictsArray,
        recentActivity: recentActivityFormatted
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{data.totalUsers.toLocaleString()}</div>
          <div className="text-sm text-blue-600">Total Users</div>
          <div className="text-xs text-green-600 mt-1">+{data.userGrowth} this month</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{data.totalApartments.toLocaleString()}</div>
          <div className="text-sm text-green-600">Active Listings</div>
          <div className="text-xs text-gray-500 mt-1">Available apartments</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{data.totalBookings.toLocaleString()}</div>
          <div className="text-sm text-purple-600">Total Bookings</div>
          <div className="text-xs text-gray-500 mt-1">{data.bookingConversion}% conversion rate</div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">€{data.monthlyRevenue.toLocaleString()}</div>
          <div className="text-sm text-yellow-600">Monthly Revenue</div>
          <div className="text-xs text-gray-500 mt-1">This month</div>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Districts */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Districts</h3>
          <div className="space-y-3">
            {data.topDistricts.map((district, index) => (
              <div key={district.district} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-400 text-gray-900' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-300 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{district.district}</span>
                </div>
                <span className="text-sm text-gray-500">{district.count} listings</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {data.recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.type === 'booking' ? 'bg-green-400' : 'bg-blue-400'
                  }`}></div>
                  <span className="text-sm text-gray-900">{activity.description}</span>
                </div>
                <span className="text-xs text-gray-500">{activity.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
