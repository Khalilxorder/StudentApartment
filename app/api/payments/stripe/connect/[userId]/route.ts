/**
 * POST /api/payments/stripe/connect/[userId]
 * Start Stripe Connect onboarding for an owner
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-build-safe';
import { stripe } from '@/lib/stripe/server';

function getSupabase() {
  return getSupabaseClient();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;

    // Verify user can only onboard themselves
    if (user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Cannot initiate onboarding for another user' },
        { status: 403 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    // Get or create Stripe Connect account
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id, email')
      .eq('id', targetUserId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let stripeAccountId = userData.stripe_account_id;

    // Create new Stripe account if needed
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userData.email || undefined,
        metadata: {
          userId: targetUserId,
        },
      });

      stripeAccountId = account.id;

      // Update user with Stripe account ID
      await supabase
        .from('users')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', targetUserId);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: 'account_onboarding',
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/owner/onboarding?refresh=true`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/owner/onboarding?connected=true`,
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId: stripeAccountId,
    });
  } catch (error) {
    console.error('Error initiating Stripe Connect:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Stripe Connect onboarding' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/stripe/connect/[userId]
 * Check Stripe Connect onboarding status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;

    // Verify user can only check their own status
    if (user.id !== targetUserId) {
      return NextResponse.json(
        { error: 'Cannot check onboarding status for another user' },
        { status: 403 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_account_id')
      .eq('id', targetUserId)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!userData.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(userData.stripe_account_id);

    return NextResponse.json({
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountId: account.id,
      requirements: {
        current: account.requirements?.currently_due || [],
        eventually: account.requirements?.eventually_due || [],
      },
    });
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error);
    return NextResponse.json(
      { error: 'Failed to check Stripe Connect status' },
      { status: 500 }
    );
  }
}
