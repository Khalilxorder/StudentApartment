import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-build-safe';
import { getStripe } from '@/lib/stripe/server';
import { logger } from '@/lib/logger';

function getSupabase() {
  return getSupabaseClient();
}

interface ConfirmPaymentRequest {
  paymentIntentId: string;
  stripeAccountId: string;
}

/**
 * POST /api/payments/confirm
 * Confirm a payment intent
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    const body = (await request.json()) as ConfirmPaymentRequest;
    const { paymentIntentId, stripeAccountId } = body;

    if (!paymentIntentId || !stripeAccountId) {
      return NextResponse.json(
        {
          error: 'paymentIntentId and stripeAccountId are required',
        },
        { status: 400 }
      );
    }

    // Get payment intent details from DB
    const { data: intentRecord, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (fetchError || !intentRecord) {
      return NextResponse.json(
        { error: 'Payment intent not found' },
        { status: 404 }
      );
    }

    // Retrieve current intent status
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount: stripeAccountId,
    });

    // If already succeeded, return success
    if (intent.status === 'succeeded') {
      // Update booking status to paid
      await supabase
        .from('bookings')
        .update({ payment_status: 'completed' })
        .eq('id', intentRecord.booking_id);

      return NextResponse.json({
        success: true,
        message: 'Payment already confirmed',
        status: 'succeeded',
      });
    }

    // If still pending, return error
    if (intent.status === 'processing' || intent.status === 'requires_action') {
      return NextResponse.json(
        {
          error: 'Payment still processing',
          status: intent.status,
        },
        { status: 202 }
      );
    }

    // If failed or canceled
    if (intent.status === 'canceled' || intent.status === 'requires_payment_method') {
      return NextResponse.json(
        {
          error: 'Payment failed or was canceled',
          status: intent.status,
        },
        { status: 400 }
      );
    }

    // If requires confirmation, confirm it
    if (intent.status === 'requires_confirmation') {
      const confirmedIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        stripeAccount: stripeAccountId,
      });

      // Update booking status to paid
      await supabase
        .from('bookings')
        .update({ payment_status: 'completed' })
        .eq('id', intentRecord.booking_id);

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
        status: confirmedIntent.status,
        amount: confirmedIntent.amount / 100,
      });
    }

    return NextResponse.json({
      success: true,
      status: intent.status,
      amount: intent.amount / 100,
    });
  } catch (error) {
    logger.error({ error }, 'Error confirming payment');
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
