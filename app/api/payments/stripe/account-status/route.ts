import { logger } from '@/lib/dev-logger';

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20' as Stripe.LatestApiVersion,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(accountId);

    return NextResponse.json({
      success: true,
      id: account.id,
      email: account.email,
      type: account.type,
      country: account.country,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      requirements: account.requirements,
      status: account.type === 'express' ? (account.charges_enabled ? 'active' : 'pending') : 'unknown',
      created_at: account.created,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching account status:');
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch account details',
      },
      { status: 500 }
    );
  }
}
