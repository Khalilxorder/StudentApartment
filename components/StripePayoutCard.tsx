'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface StripePayoutCardProps {
  stripeAccountId?: string;
  stripeConnectStatus?: string;
  email?: string;
}

type StripeStatus = 'pending' | 'active' | 'rejected' | 'not_started';

export default function StripePayoutCard({
  stripeAccountId,
  stripeConnectStatus = 'not_started',
  email
}: StripePayoutCardProps) {
  const [status, setStatus] = useState<StripeStatus>('not_started');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountDetails, setAccountDetails] = useState<any>(null);

  useEffect(() => {
    if (stripeConnectStatus) {
      setStatus(stripeConnectStatus as StripeStatus);
    }
  }, [stripeConnectStatus]);

  const fetchAccountDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments/stripe/account-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: stripeAccountId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch account details');
      }

      const data = await response.json();
      setAccountDetails(data);
    } catch (err) {
      console.error('Error fetching account details:', err);
      setError('Unable to load account details');
    } finally {
      setLoading(false);
    }
  }, [stripeAccountId]);

  // Fetch account details when component mounts or account ID changes
  useEffect(() => {
    if (stripeAccountId && status === 'active') {
      fetchAccountDetails();
    }
  }, [stripeAccountId, status, fetchAccountDetails]);

  const getStatusBadge = () => {
    const baseClasses = 'inline-block px-3 py-1 rounded-full text-sm font-medium';

    switch (status) {
      case 'active':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Active
          </span>
        );
      case 'pending':
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Pending Setup
          </span>
        );
      case 'rejected':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Rejected
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            Not Started
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stripe Payouts</h3>
          <p className="text-sm text-gray-600 mt-1">Manage your payment account and earnings</p>
        </div>
        <div>{getStatusBadge()}</div>
      </div>

      {/* Not Started State */}
      {status === 'not_started' && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
          <p className="text-sm text-gray-700 mb-4">
            Set up your Stripe account to start receiving payouts when tenants book your apartments.
          </p>
          <Link
            href="/owner/onboarding"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Complete Stripe Setup
          </Link>
        </div>
      )}

      {/* Pending State */}
      {status === 'pending' && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 mb-4">
          <p className="text-sm text-gray-700 mb-3">
            <strong>Account Under Review:</strong> Your Stripe account is being set up. This usually takes 24-48 hours.
          </p>
          {stripeAccountId && (
            <p className="text-xs text-gray-600 mb-3">
              Account ID: <code className="bg-white px-2 py-1 rounded text-gray-700">{stripeAccountId}</code>
            </p>
          )}
          <button
            onClick={fetchAccountDetails}
            disabled={loading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>
      )}

      {/* Active State */}
      {status === 'active' && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <p className="text-sm text-gray-700 font-medium">
              Your account is active and ready to receive payments
            </p>
          </div>

          {accountDetails && (
            <div className="space-y-3">
              {accountDetails.charges_enabled && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">*</span>
                  <span className="text-gray-700">Charges enabled</span>
                </div>
              )}
              {accountDetails.payouts_enabled && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-600">*</span>
                  <span className="text-gray-700">Payouts enabled</span>
                </div>
              )}
              {accountDetails.email && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-gray-900 font-medium">{accountDetails.email}</span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
            >
              Stripe Dashboard
            </a>
            <button
              onClick={fetchAccountDetails}
              disabled={loading}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Refresh'}
            </button>
          </div>
        </div>
      )}

      {/* Rejected State */}
      {status === 'rejected' && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 mb-4">
          <p className="text-sm text-gray-700 mb-4">
            <strong>Account Rejected:</strong> Your account application was rejected. Please contact Stripe support for more information.
          </p>
          <a
            href="https://stripe.com/support"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Contact Stripe Support
          </a>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">About Payouts</h4>
        <ul className="space-y-2 text-xs text-gray-600">
          <li>* Receive payments directly to your bank account</li>
          <li>* Automatic payouts every 2-7 business days (depending on your location)</li>
          <li>* Real-time balance and transaction tracking</li>
          <li>* Protected by Stripe&apos;s secure payment processing</li>
        </ul>
      </div>
    </div>
  );
}
