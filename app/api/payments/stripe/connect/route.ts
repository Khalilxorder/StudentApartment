import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabaseClient';
import { getStripe } from '@/lib/stripe/server';

interface ConnectAccountRequest {
  userId: string;
  email: string;
  country: string;
  businessName?: string;
}

/**
 * POST /api/payments/stripe/connect
 * Create Stripe Connect account and generate onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = (await request.json()) as ConnectAccountRequest;
    const { userId, email, country = 'HU', businessName } = body;

    // Check if user already has a connected account
    const { data: existing } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing && existing.status === 'active') {
      return NextResponse.json({
        success: true,
        message: 'Account already connected',
        account_id: existing.stripe_account_id,
        status: existing.status,
      });
    }

    // Create new Stripe Connect account
    const stripeClient = getStripe();
    if (!stripeClient) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const account = await stripeClient.accounts.create({
      type: 'express',
      country,
      email,
      business_type: 'individual',
      individual: {
        email,
        address: {
          country,
        },
      },
    });

    // Store in database
    const { error: insertError } = await supabase
      .from('stripe_connect_accounts')
      .insert({
        user_id: userId,
        stripe_account_id: account.id,
        status: 'pending',
        email,
        country,
        business_name: businessName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to store Stripe account:', insertError);
      return NextResponse.json(
        { error: 'Failed to create account record' },
        { status: 500 }
      );
    }

    // Generate onboarding link
    const link = await stripeClient.accountLinks.create({
      account: account.id,
      type: 'account_onboarding',
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/owner/onboarding/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/owner/onboarding/complete`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Stripe Connect account created',
        account_id: account.id,
        onboarding_url: link.url,
        status: 'pending',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/stripe/connect/[userId]
 * Get Stripe Connect account status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const supabase = createServiceClient();
    const { userId } = params;

    const { data: account, error } = await supabase
      .from('stripe_connect_accounts')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'No connected account found' },
        { status: 404 }
      );
    }

    // Check Stripe account status
    const stripeClient = getStripe();
    if (!stripeClient) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    const stripeAccount = await stripeClient.accounts.retrieve(
      account.stripe_account_id
    );

    const updated = {
      ...account,
      stripe_details: {
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        requirements: stripeAccount.requirements,
      },
    };

    // Update status in DB if changed
    if (stripeAccount.charges_enabled && account.status !== 'active') {
      await supabase
        .from('stripe_connect_accounts')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }

    return NextResponse.json({
      success: true,
      account: updated,
    });
  } catch (error) {
    console.error('Error retrieving Stripe Connect account:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve account status' },
      { status: 500 }
    );
  }
}

