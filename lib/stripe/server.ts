// Stripe Server-Side Client
// For backend payment processing

import type Stripe from 'stripe';

// Lazy Stripe getter to avoid constructing client at module load (build-safe)
let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  // Require at runtime so import doesn't instantiate during static analysis
  const StripeCtor = require('stripe') as typeof import('stripe');
  _stripe = new (StripeCtor as any)(key, {
    apiVersion: '2024-06-20',
    typescript: true,
  }) as unknown as Stripe;
  return _stripe;
}

export const STRIPE_CONFIG = {
  currency: 'huf',
  paymentMethodTypes: ['card'],
};

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return key !== undefined && key !== '' && !key.includes('EXAMPLE');
}
