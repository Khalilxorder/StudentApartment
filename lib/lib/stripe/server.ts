// Stripe Server-Side Client
// For backend payment processing

import Stripe from 'stripe';

// Make Stripe optional during build if key not set
const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2024-06-20' as any,
  typescript: true,
}) : null;

export const STRIPE_CONFIG = {
  currency: 'huf',
  paymentMethodTypes: ['card'],
};

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return key !== undefined && key !== '' && !key.includes('EXAMPLE');
}
