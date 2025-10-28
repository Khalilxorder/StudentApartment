/**
 * GET /api/payments/intents/[id]
 * Retrieve a specific payment intent
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/server';

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const intentId = params.id;

    if (!intentId) {
      return NextResponse.json(
        { error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Get payment intent from database
    const { data: intentRecord, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('stripe_payment_intent_id', intentId)
      .single();

    if (fetchError || !intentRecord) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }

    // Verify user owns this payment intent
    if (intentRecord.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to view this payment intent' },
        { status: 403 }
      );
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    // Get latest intent status from Stripe
    const stripeIntent = await stripe.paymentIntents.retrieve(intentId);

    return NextResponse.json({
      id: stripeIntent.id,
      status: stripeIntent.status,
      amount: stripeIntent.amount / 100,
      currency: stripeIntent.currency,
      clientSecret: stripeIntent.client_secret,
      created: stripeIntent.created,
      metadata: stripeIntent.metadata,
    });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}
