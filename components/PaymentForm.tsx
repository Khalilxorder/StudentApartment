'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

function PaymentFormContent({
  bookingId,
  amount,
  stripeAccountId,
  onSuccess,
}: {
  bookingId: string;
  amount: number;
  stripeAccountId: string;
  onSuccess?: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Stripe not loaded');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const intentResponse = await fetch('/api/payments/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount,
          stripeAccountId,
        }),
      });

      if (!intentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const intentData = (await intentResponse.json()) as { client_secret: string };

      // Confirm payment
      const result = await stripe.confirmCardPayment(
        intentData.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: { name: 'Student' },
          },
        }
      );

      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent?.status === 'succeeded') {
        onSuccess?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-300 rounded-lg p-4">
        <CardElement
          options={{
            style: {
              base: { fontSize: '16px' },
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          Amount: <span className="font-medium">{amount.toLocaleString()} HUF</span>
        </p>
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition"
      >
        {loading ? 'Processing...' : `Pay ${amount.toLocaleString()} HUF`}
      </button>
    </form>
  );
}

export function PaymentForm({
  bookingId,
  amount,
  stripeAccountId,
  onSuccess,
}: {
  bookingId: string;
  amount: number;
  stripeAccountId: string;
  onSuccess?: () => void;
}) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent
        bookingId={bookingId}
        amount={amount}
        stripeAccountId={stripeAccountId}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
