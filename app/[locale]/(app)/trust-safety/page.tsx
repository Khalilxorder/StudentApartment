'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface TrustScore {
  score: number;
  level: string;
  description: string;
}

interface SafetyCheck {
  identityVerified: boolean;
  backgroundCheck: boolean;
  noRecentReports: boolean;
  accountAge: number;
  trustScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export default function TrustSafetyPage() {
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [safetyCheck, setSafetyCheck] = useState<SafetyCheck | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportTargetUser, setReportTargetUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadTrustData = useCallback(async () => {
    try {
      // Load trust score
      const trustResponse = await fetch('/api/trust-safety?action=trust_score');
      if (trustResponse.ok) {
        const trustData = await trustResponse.json();
        setTrustScore(calculateTrustLevel(trustData.trustScore));
      }

      // Load safety check
      const safetyResponse = await fetch('/api/trust-safety?action=safety_check');
      if (safetyResponse.ok) {
        const safetyData = await safetyResponse.json();
        setSafetyCheck(safetyData);
      }
    } catch (error) {
      console.error('Failed to load trust data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrustData();
  }, [loadTrustData]);

  const calculateTrustLevel = (score: number): TrustScore => {
    if (score >= 80) {
      return {
        score,
        level: 'Excellent',
        description: 'Highly trusted user with verified credentials'
      };
    } else if (score >= 60) {
      return {
        score,
        level: 'Good',
        description: 'Trusted user with some verification'
      };
    } else if (score >= 40) {
      return {
        score,
        level: 'Fair',
        description: 'Basic trust level, more verification recommended'
      };
    } else {
      return {
        score,
        level: 'Low',
        description: 'Limited trust, additional verification needed'
      };
    }
  };

  const submitReport = async () => {
    if (!reportTargetUser || !reportReason) {
      setMessage('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/trust-safety', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'report_user',
          targetUserId: reportTargetUser,
          reason: reportReason,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage('Report submitted successfully. Thank you for helping keep our community safe.');
        setReportReason('');
        setReportTargetUser('');
      } else {
        setMessage(result.error || 'Failed to submit report');
      }
    } catch (error) {
      setMessage('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Trust & Safety</h1>
          <p className="text-gray-600">
            Your safety and trust are our top priorities. Monitor your trust score and help maintain a safe community.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Trust Score */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Trust Score</h2>
            {trustScore && (
              <div className="text-center">
                <div className={`text-6xl font-bold mb-2 ${getScoreColor(trustScore.score)}`}>
                  {trustScore.score}
                </div>
                <div className="text-lg font-medium text-gray-900 mb-1">{trustScore.level}</div>
                <p className="text-sm text-gray-600">{trustScore.description}</p>
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">What affects your score?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Identity verification (+20 points)</li>
                <li>• Background check completion (+15 points)</li>
                <li>• Account age (up to +10 points)</li>
                <li>• User reports (-5 points each)</li>
                <li>• Successful transactions (+2 points each)</li>
              </ul>
            </div>
          </div>

          {/* Safety Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Safety Status</h2>
            {safetyCheck && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Risk Level</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskBadgeColor(safetyCheck.riskLevel)}`}>
                    {safetyCheck.riskLevel.charAt(0).toUpperCase() + safetyCheck.riskLevel.slice(1)} Risk
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Identity Verified</span>
                    <span className={`text-sm ${safetyCheck.identityVerified ? 'text-green-600' : 'text-red-600'}`}>
                      {safetyCheck.identityVerified ? '✓' : '✗'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Background Check</span>
                    <span className={`text-sm ${safetyCheck.backgroundCheck ? 'text-green-600' : 'text-red-600'}`}>
                      {safetyCheck.backgroundCheck ? '✓' : '✗'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">No Recent Reports</span>
                    <span className={`text-sm ${safetyCheck.noRecentReports ? 'text-green-600' : 'text-red-600'}`}>
                      {safetyCheck.noRecentReports ? '✓' : '✗'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Account Age</span>
                    <span className="text-sm text-gray-900">{safetyCheck.accountAge} days</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Report User */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report a Concern</h2>
          <p className="text-gray-600 mb-4">
            If you encounter suspicious behavior, fraud, or feel unsafe, please report it.
            All reports are confidential and help maintain a safe community.
          </p>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID or Email (of the person you&apos;re reporting)
              </label>
              <input
                type="text"
                value={reportTargetUser}
                onChange={(e) => setReportTargetUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter user ID or email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a reason</option>
                <option value="fraud">Fraud or scam</option>
                <option value="harassment">Harassment or threats</option>
                <option value="fake_account">Fake account</option>
                <option value="inappropriate_content">Inappropriate content</option>
                <option value="spam">Spam or unwanted contact</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              onClick={submitReport}
              disabled={submitting || !reportTargetUser || !reportReason}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting Report...' : 'Submit Report'}
            </button>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">Safety Tips</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">For Students:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Meet in public places for viewings</li>
                <li>• Bring a friend or family member</li>
                <li>• Trust your instincts</li>
                <li>• Verify property details</li>
                <li>• Keep communication records</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">For Property Owners:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Verify student identity</li>
                <li>• Don&apos;t share personal information</li>
                <li>• Use secure payment methods</li>
                <li>• Document property condition</li>
                <li>• Report suspicious inquiries</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}