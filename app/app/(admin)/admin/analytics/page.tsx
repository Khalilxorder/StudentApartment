'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface DashboardData {
  overview: {
    totalUsers: number;
    newUsers: number;
    verifiedUsers: number;
    studentCount: number;
    ownerCount: number;
    totalReports: number;
    recentReports: number;
    totalMessages: number;
    recentMessages: number;
  };
  timeframe: string;
}

interface UserMetrics {
  userTrends: any[];
  typeDistribution: { student: number; owner: number };
  verificationRate: number;
  totalUsers: number;
  verifiedUsers: number;
}

interface SafetyMetrics {
  totalReports: number;
  recentReports: number;
  reportTrends: any[];
  scoreDistribution: { excellent: number; good: number; fair: number; low: number };
  verificationCompletion: { identity: number; background: number };
}

export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [safetyMetrics, setSafetyMetrics] = useState<SafetyMetrics | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, userRes, safetyRes] = await Promise.all([
        fetch(`/api/analytics?timeframe=${timeframe}`),
        fetch(`/api/analytics?metric=user_metrics&timeframe=${timeframe}`),
        fetch(`/api/analytics?metric=safety_metrics&timeframe=${timeframe}`),
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setDashboardData(data);
      }

      if (userRes.ok) {
        const data = await userRes.json();
        setUserMetrics(data);
      }

      if (safetyRes.ok) {
        const data = await safetyRes.json();
        setSafetyMetrics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadDashboardData();
  }, [timeframe, loadDashboardData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return (num * 100).toFixed(1) + '%';
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitor user behavior, safety metrics, and platform performance
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'users', name: 'Users' },
              { id: 'safety', name: 'Safety' },
              { id: 'engagement', name: 'Engagement' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatNumber(dashboardData.overview.totalUsers)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Verified Users</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatNumber(dashboardData.overview.verifiedUsers)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Safety Reports</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatNumber(dashboardData.overview.totalReports)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Messages</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatNumber(dashboardData.overview.totalMessages)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* User Type Distribution */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(dashboardData.overview.studentCount)}</div>
                  <div className="text-sm text-gray-500">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatNumber(dashboardData.overview.ownerCount)}</div>
                  <div className="text-sm text-gray-500">Property Owners</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && userMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Rate</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatPercentage(userMetrics.verificationRate / 100)}
                </div>
                <p className="text-sm text-gray-600">
                  {userMetrics.verifiedUsers} of {userMetrics.totalUsers} users verified
                </p>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Types</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Students</span>
                    <span className="text-sm font-medium">{userMetrics.typeDistribution.student}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Owners</span>
                    <span className="text-sm font-medium">{userMetrics.typeDistribution.owner}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Growth</h3>
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  +{formatNumber(userMetrics.userTrends.length)}
                </div>
                <p className="text-sm text-gray-600">New users in period</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safety' && safetyMetrics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Total Reports</h3>
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {formatNumber(safetyMetrics.totalReports)}
                </div>
                <p className="text-sm text-gray-600">
                  {safetyMetrics.recentReports} in last {timeframe}
                </p>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Trust Score Distribution</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Excellent (80-100)</span>
                    <span className="text-sm font-medium">{safetyMetrics.scoreDistribution.excellent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-blue-600">Good (60-79)</span>
                    <span className="text-sm font-medium">{safetyMetrics.scoreDistribution.good}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-yellow-600">Fair (40-59)</span>
                    <span className="text-sm font-medium">{safetyMetrics.scoreDistribution.fair}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Low (0-39)</span>
                    <span className="text-sm font-medium">{safetyMetrics.scoreDistribution.low}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Completion</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Identity Verified</span>
                    <span className="text-sm font-medium">{safetyMetrics.verificationCompletion.identity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Background Check</span>
                    <span className="text-sm font-medium">{safetyMetrics.verificationCompletion.background}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'engagement' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Platform Engagement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {formatNumber(dashboardData?.overview.totalMessages || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Total Messages</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-600 mb-2">
                    {formatNumber(dashboardData?.overview.recentMessages || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Messages This Period</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}