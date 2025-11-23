// Stripe Webhook Handler - Handles payment events
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createClient } from '@/utils/supabaseClient';
// import * as Sentry from '@sentry/nextjs'; // Temporarily disabled due to parsing error
import type Stripe from 'stripe';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    // Sentry.captureException(err, {
    //   tags: { webhook: 'stripe_signature_verification' },
    // }); // Temporarily disabled due to parsing error
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    // Sentry.captureException(error, {
    //   tags: { webhook: 'stripe_handler' },
    //   extra: { eventType: event?.type },
    // }); // Temporarily disabled due to parsing error
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient();
  const bookingId = paymentIntent.metadata.booking_id;
  const userId = paymentIntent.metadata.user_id;

  console.log(`✅ Payment succeeded for booking: ${bookingId}`);

  // 1. Update booking status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // 2. Update payment transaction
  await supabase
    .from('payment_transactions')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // 3. Create notification for user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment',
    title: 'Payment Successful!',
    content: `Your booking payment of ${(paymentIntent.amount).toLocaleString()} HUF has been processed successfully.`,
    link: `/dashboard/bookings/${bookingId}`,
  });

  // 4. Get booking details to notify owner
  const { data: booking } = await supabase
    .from('bookings')
    .select('owner_id, apartment_id, apartments(title)')
    .eq('id', bookingId)
    .single();

  if (booking && booking.owner_id) {
    const apartmentTitle = (booking.apartments as any)?.title || 'your apartment';
    await supabase.from('notifications').insert({
      user_id: booking.owner_id,
      type: 'booking',
      title: 'New Booking Confirmed',
      content: `Payment received for ${apartmentTitle}. Review the booking request.`,
      link: `/owner/bookings`,
    });
  }

  // 5. TODO: Send confirmation emails (integrate with Resend/SendGrid)
  // await sendBookingConfirmationEmail(userId, bookingId);
  // await sendOwnerNotificationEmail(booking.owner_id, bookingId);

  console.log(`📧 Notifications sent for booking: ${bookingId}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient();
  const bookingId = paymentIntent.metadata.booking_id;
  const userId = paymentIntent.metadata.user_id;

  console.log(`❌ Payment failed for booking: ${bookingId}`);

  // 1. Update booking status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'unpaid',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // 2. Update payment transaction
  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // 3. Notify user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment',
    title: 'Payment Failed',
    content: 'Your payment could not be processed. Please try again or use a different payment method.',
    link: `/dashboard/bookings/${bookingId}`,
  });
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient();
  const bookingId = paymentIntent.metadata.booking_id;

  console.log(`🚫 Payment canceled for booking: ${bookingId}`);

  await supabase
    .from('bookings')
    .update({
      payment_status: 'unpaid',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  await supabase
    .from('payment_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}
