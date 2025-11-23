'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Apartment } from '@/types/apartment';
import { useRouter } from 'next/navigation';
import { trackEvent } from './AnalyticsProvider';

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface PaymentModalProps {
  apartment: Apartment;
  onClose: () => void;
  userEmail?: string;
}

function PaymentForm({ apartment, onClose, bookingId }: { apartment: Apartment; onClose: () => void; bookingId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/bookings?booking=${bookingId}&payment=success`,
        },
      });

      if (submitError) {
        setError(submitError.message || 'An error occurred during payment');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: {
            billingDetails: {
              email: '',
            },
          },
        }}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
          <svg className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
        <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Secure Payment powered by Stripe</p>
          <p>Your payment information is encrypted and secure.</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe}
          className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </button>
      </div>
    </form>
  );
}

export default function PaymentModal({ apartment, onClose, userEmail }: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const depositAmount = (apartment.price_huf || 0) * (apartment.deposit_months || 1);
  const firstMonthRent = apartment.price_huf || 0;
  const totalAmount = depositAmount + firstMonthRent;

  useEffect(() => {
    if (!userEmail || !stripePromise) return;

    const createPaymentIntent = async () => {
      try {
        // Fetch CSRF token first
        const csrfResponse = await fetch('/api/csrf', { cache: 'no-store' });
        const csrfData = await csrfResponse.json();
        const csrfToken = csrfData?.csrfToken;

        if (!csrfToken) {
          throw new Error('Failed to obtain CSRF token');
        }

        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            apartmentId: apartment.id,
            userId: userEmail,
            moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            leaseMonths: 12,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
        setBookingId(data.bookingId);

        // Track booking creation
        trackEvent('booking_created', {
          apartment_id: apartment.id,
          apartment_title: apartment.title,
          booking_id: data.bookingId,
          amount: data.amount,
        });
      } catch (err: any) {
        console.error('Payment intent creation error:', err);
        setError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [apartment.id, apartment.title, userEmail]);

  // No Stripe configured - show error
  if (!stripePromise) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Payment System Unavailable</h3>
          <p className="text-gray-600 mb-6">
            Payment processing is currently unavailable. Please contact support or try again later.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!userEmail) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h3>
          <p className="text-gray-600 mb-6">Please log in to proceed with payment.</p>
          <div className="flex gap-3">
            <a
              href="/login"
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-4 rounded-lg text-center transition"
            >
              Login
            </a>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error during payment intent creation
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-3 px-4 rounded-lg transition"
            >
              Try Again
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading payment intent
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Initializing Payment...</h3>
          <p className="text-gray-600">Please wait</p>
        </div>
      </div>
    );
  }

  // Main payment form with Stripe Elements
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Secure Payment</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition p-2"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Apartment Summary */}
          <div className="bg-yellow-50 rounded-lg p-5 mb-6 border border-yellow-200">
            <h4 className="font-bold text-gray-900 mb-3 text-lg">{apartment.title}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="font-medium text-gray-900">{firstMonthRent.toLocaleString()} HUF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Deposit ({apartment.deposit_months || 1} month{(apartment.deposit_months || 1) > 1 ? 's' : ''})</span>
                <span className="font-medium text-gray-900">{depositAmount.toLocaleString()} HUF</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-yellow-300 mt-3">
                <span className="font-bold text-gray-900 text-base">Total Due Today</span>
                <span className="font-bold text-yellow-600 text-xl">{totalAmount.toLocaleString()} HUF</span>
              </div>
            </div>
          </div>

          {/* Payment Form with Stripe Elements */}
          {clientSecret && bookingId && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#FBBF24',
                    colorBackground: '#ffffff',
                    colorText: '#111827',
                    colorDanger: '#dc2626',
                    fontFamily: 'system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm apartment={apartment} onClose={onClose} bookingId={bookingId} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
}
