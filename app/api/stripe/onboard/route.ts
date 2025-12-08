import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { logger } from '@/lib/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
});

/**
 * POST /api/stripe/onboard
 * Create a Stripe Connect onboarding link for the owner
 */
export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.error('STRIPE_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Stripe is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Get user ID from request body
    const body = await request.json().catch(() => ({}));
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    try {
      // Try to create onboarding link for existing or new account
      const accountId = `acct_${userId}`;

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        refresh_url: `${request.headers.get('origin')}/owner/onboarding?retry=true`,
        return_url: `${request.headers.get('origin')}/owner/overview`,
      });

      return NextResponse.json(
        {
          url: accountLink.url,
          success: true
        },
        { status: 200 }
      );
    } catch (stripeError: any) {
      // If account doesn't exist, create it first
      if (stripeError.code === 'resource_missing') {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: `owner_${userId}@studentapartments.local`,
        });

        const accountLink = await stripe.accountLinks.create({
          account: account.id,
          type: 'account_onboarding',
          refresh_url: `${request.headers.get('origin')}/owner/onboarding?retry=true`,
          return_url: `${request.headers.get('origin')}/owner/overview`,
        });

        return NextResponse.json(
          {
            url: accountLink.url,
            success: true
          },
          { status: 200 }
        );
      }

      logger.error({ error: stripeError.message }, 'Stripe onboard error');
      return NextResponse.json(
        { error: 'Failed to create Stripe onboarding link' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logger.error({ error }, 'Onboarding error');
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
