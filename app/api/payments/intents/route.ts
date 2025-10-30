import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

interface PaymentIntentRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  description?: string;
  stripeAccountId: string;
}

/**
 * POST /api/payments/intents
 * Create a payment intent
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PaymentIntentRequest;
    const {
      bookingId,
      amount,
      currency = 'HUF',
      description,
      stripeAccountId,
    } = body;

    if (!bookingId || !amount || !stripeAccountId) {
      return NextResponse.json(
        {
          error:
            'bookingId, amount, and stripeAccountId are required',
        },
        { status: 400 }
      );
    }

    // Create payment intent on connected account
    const intent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description: description || `Booking payment for ${bookingId}`,
        metadata: {
          bookingId,
        },
      },
      { stripeAccount: stripeAccountId }
    );

    // Store in database
    await getSupabaseClient().from('payment_intents').insert({
      booking_id: bookingId,
      stripe_payment_intent_id: intent.id,
      amount_cents: intent.amount,
      currency: intent.currency,
      status: intent.status,
      metadata: {
        description,
        created_at: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        client_secret: intent.client_secret,
        intent_id: intent.id,
        status: intent.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/intents/[id]
 * Get payment intent status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: intentRecord, error } = await getSupabaseClient()`n      .from('payment_intents')
      .select('*')
      .eq('stripe_payment_intent_id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }

    // Check current status with Stripe
    const intent = await stripe.paymentIntents.retrieve(id);

    return NextResponse.json({
      success: true,
      intent: {
        id: intent.id,
        status: intent.status,
        amount: intent.amount / 100,
        currency: intent.currency,
        booking_id: intentRecord.booking_id,
        created_at: intentRecord.created_at,
      },
    });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}
