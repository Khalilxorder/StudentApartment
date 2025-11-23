'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, CreditCard, Shield, DollarSign } from 'lucide-react';

export default function OwnerOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<'not_started' | 'in_progress' | 'completed' | 'failed'>('not_started');
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const router = useRouter();

  const checkOnboardingStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user has a Stripe account
      const { data: profile } = await supabase
        .from('profiles_owner')
        .select('stripe_account_id, payout_enabled')
        .eq('id', user.id)
        .single();

      if (profile?.stripe_account_id) {
        setStripeAccountId(profile.stripe_account_id);
        setOnboardingStatus(profile.payout_enabled ? 'completed' : 'in_progress');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }, [router]);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const startStripeOnboarding = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Load user profile for email & company info
      const { data: profile } = await supabase
        .from('profiles_owner')
        .select('company_name')
        .eq('id', user.id)
        .single();

      // Fetch CSRF token
      const csrfResponse = await fetch('/api/csrf');
      const { csrfToken } = await csrfResponse.json();

      if (!csrfToken) {
        throw new Error('Failed to get CSRF token');
      }

      // Call the real Stripe Connect endpoint
      const response = await fetch('/api/payments/stripe/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email || '',
          country: 'HU',  // Could be parameterized from user preferences
          businessName: profile?.company_name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start onboarding');
      }

      if (data.onboarding_url) {
        // Redirect to Stripe Connect onboarding
        window.location.href = data.onboarding_url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      setOnboardingStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (onboardingStatus) {
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'in_progress':
        return <CreditCard className="h-8 w-8 text-blue-500" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusMessage = () => {
    switch (onboardingStatus) {
      case 'completed':
        return 'Your Stripe account is fully set up and ready to receive payments!';
      case 'failed':
        return 'There was an issue with your onboarding. Please try again.';
      case 'in_progress':
        return 'Your Stripe account is being reviewed. This usually takes 24-48 hours.';
      default:
        return 'Complete your Stripe Connect onboarding to start receiving payments from tenants.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Owner Onboarding</h1>
          <p className="mt-2 text-lg text-gray-600">
            Set up your payment processing to start receiving rent payments
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center space-x-4">
              {getStatusIcon()}
              <div>
                <CardTitle className="text-xl">
                  Stripe Connect Setup
                </CardTitle>
                <CardDescription>
                  {getStatusMessage()}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {onboardingStatus === 'not_started' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <Shield className="h-12 w-12 text-blue-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Secure</h3>
                    <p className="text-sm text-gray-600">Bank-level security</p>
                  </div>
                  <div className="text-center">
                    <CreditCard className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Easy</h3>
                    <p className="text-sm text-gray-600">Simple setup process</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 text-purple-500 mx-auto mb-2" />
                    <h3 className="font-semibold">Profitable</h3>
                    <p className="text-sm text-gray-600">Low transaction fees</p>
                  </div>
                </div>

                <Button
                  onClick={startStripeOnboarding}
                  disabled={loading}
                  className="w-full mb-3"
                  size="lg"
                >
                  {loading ? 'Starting Setup...' : 'Start Stripe Onboarding'}
                </Button>
                
                <Button
                  onClick={() => router.push('/owner/overview')}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  Skip for Now
                </Button>
                <p className="text-sm text-gray-500 text-center mt-2">
                  You can set this up later from Profile & Payouts
                </p>
              </div>
            )}

            {onboardingStatus === 'in_progress' && (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your application is being reviewed by Stripe. This usually takes 24-48 hours.
                </p>
                <Button
                  onClick={checkOnboardingStatus}
                  variant="outline"
                >
                  Check Status
                </Button>
              </div>
            )}

            {onboardingStatus === 'completed' && (
              <div className="text-center">
                <p className="text-green-600 mb-4">
                  ✅ Your account is ready to receive payments!
                </p>
                <Button
                  onClick={() => router.push('/owner/listings')}
                >
                  Go to Listings
                </Button>
              </div>
            )}

            {onboardingStatus === 'failed' && (
              <div className="text-center">
                <p className="text-red-600 mb-4">
                  There was an issue with your onboarding. Please try again.
                </p>
                <Button
                  onClick={startStripeOnboarding}
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>You&apos;ll be redirected to Stripe&apos;s secure onboarding flow</li>
              <li>Provide your business information and bank details</li>
              <li>Stripe will verify your identity (usually takes 24-48 hours)</li>
              <li>Once approved, you can start receiving payments from tenants</li>
              <li>All payments are held securely until tenants move in</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}