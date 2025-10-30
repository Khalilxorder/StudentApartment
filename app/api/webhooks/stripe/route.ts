// Stripe Webhook Handler - Handles payment events
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/utils/supabaseClient';
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

      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
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
  const supabase = createServiceClient();
  const metadata = paymentIntent.metadata || {};
  const bookingId = metadata.booking_id;
  const userId = metadata.user_id;

  console.log(`✅ Payment succeeded for booking: ${bookingId}`);

  // 1. Update booking status
  await getSupabaseClient()`n    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'approved',
      payment_method: 'stripe',
      payment_id: paymentIntent.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // 2. Update payment transaction
  await getSupabaseClient()`n    .from('payment_transactions')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_session_id', paymentIntent.id);

  // 3. Create notification for user (using correct field names)
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment',
    title: 'Payment Successful!',
    body: `Your booking payment of ${(paymentIntent.amount).toLocaleString()} HUF has been processed successfully.`,
    data: { link: `/dashboard/bookings/${bookingId}`, bookingId },
  });

  // 4. Get booking details to notify owner
  const { data: booking } = await getSupabaseClient()`n    .from('bookings')
    .select('owner_id, apartment_id, apartments(title)')
    .eq('id', bookingId)
    .single();

  if (booking && booking.owner_id) {
    const apartmentTitle = (booking.apartments as any)?.title || 'your apartment';
    await supabase.from('notifications').insert({
      user_id: booking.owner_id,
      type: 'booking',
      title: 'New Booking Confirmed',
      body: `Payment received for ${apartmentTitle}. Review the booking request.`,
      data: { link: `/owner/bookings`, bookingId, apartmentTitle },
    });
  }

  // 5. TODO: Send confirmation emails (integrate with Resend/SendGrid)
  // await sendBookingConfirmationEmail(userId, bookingId);
  // await sendOwnerNotificationEmail(booking.owner_id, bookingId);

  console.log(`📧 Notifications sent for booking: ${bookingId}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServiceClient();
  const metadata = paymentIntent.metadata || {};
  const bookingId = metadata.booking_id;
  const userId = metadata.user_id;

  console.log(`❌ Payment failed for booking: ${bookingId}`);

  // 1. Update booking status
  await getSupabaseClient()`n    .from('bookings')
    .update({
      payment_status: 'unpaid',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  // 2. Update payment transaction
  await getSupabaseClient()`n    .from('payment_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_session_id', paymentIntent.id);

  // 3. Notify user (using correct field names)
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment',
    title: 'Payment Failed',
    body: 'Your payment could not be processed. Please try again or use a different payment method.',
    data: { link: `/dashboard/bookings/${bookingId}`, bookingId },
  });
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServiceClient();
  const metadata = paymentIntent.metadata || {};
  const bookingId = metadata.booking_id;

  console.log(`🚫 Payment canceled for booking: ${bookingId}`);

  await getSupabaseClient()`n    .from('bookings')
    .update({
      payment_status: 'unpaid',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  await getSupabaseClient()`n    .from('payment_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_session_id', paymentIntent.id);
}

async function handlePayoutCreated(payout: Stripe.Payout) {
  const supabase = createServiceClient();
  const { id, amount, currency, metadata } = payout;
  const bookingId = metadata?.booking_id;
  const userId = metadata?.user_id;

  console.log(`💰 Payout created: ${id} for booking: ${bookingId}`);

  // 1. Verify owner is verified before allowing payout
  if (!userId) {
    console.error(`❌ Payout blocked: No user ID in metadata for payout ${id}`);
    // Cancel the payout if no user ID
    if (stripe) await stripe.payouts.cancel(id);
    return;
  }

  // Check if owner has completed Stripe Connect verification
  const { data: stripeAccount, error: accountError } = await getSupabaseClient()`n    .from('stripe_connect_accounts')
    .select('status, stripe_account_id')
    .eq('user_id', userId)
    .single();

  if (accountError || !stripeAccount) {
    console.error(`❌ Payout blocked: No Stripe Connect account for user ${userId}`);
    if (stripe) await stripe.payouts.cancel(id);
    return;
  }

  if (stripeAccount.status !== 'active') {
    console.error(`❌ Payout blocked: Stripe account not verified for user ${userId} (status: ${stripeAccount.status})`);
    if (stripe) await stripe.payouts.cancel(id);
    return;
  }

  // Verify the Stripe account is still active in Stripe
  try {
    if (!stripe) throw new Error('Stripe not configured');
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);
    if (!account.payouts_enabled) {
      console.error(`❌ Payout blocked: Payouts not enabled for Stripe account ${stripeAccount.stripe_account_id}`);
      await stripe.payouts.cancel(id);
      return;
    }
  } catch (error) {
    console.error(`❌ Payout blocked: Error verifying Stripe account ${stripeAccount.stripe_account_id}:`, error);
    if (stripe) await stripe.payouts.cancel(id);
    return;
  }

  console.log(`✅ Payout approved: Owner ${userId} is verified and payouts enabled`);

  // 2. Update booking status to paid
  if (bookingId) {
    await getSupabaseClient()`n      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
  }

  // 3. Create payment transaction record
  await getSupabaseClient()`n    .from('payment_transactions')
    .insert({
      user_id: userId,
      booking_id: bookingId,
      amount: amount / 100, // Convert from cents
      currency: currency.toUpperCase(),
      type: 'payout',
      status: 'pending',
      provider: 'stripe',
      provider_session_id: id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  // 4. Notify owner of payout initiation
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payout',
    title: 'Payout Initiated',
    body: `A payout of ${(amount / 100).toLocaleString()} ${currency.toUpperCase()} has been initiated for your booking.`,
    data: { link: `/dashboard/payouts`, bookingId: bookingId },
  });
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  const supabase = createServiceClient();
  const { id, metadata } = payout;
  const bookingId = metadata?.booking_id;
  const userId = metadata?.user_id;

  console.log(`❌ Payout failed: ${id} for booking: ${bookingId}`);

  // 1. Update the payout status in payment_transactions
  await getSupabaseClient()`n    .from('payment_transactions')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_session_id', id);

  // 2. Notify user about the payout failure
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payout',
    title: 'Payout Failed',
    body: 'Your payout could not be processed. Please check your account details or try again later.',
    data: { link: `/dashboard/payouts`, bookingId: bookingId },
  });
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  const supabase = createServiceClient();
  const { id, metadata } = payout;
  const bookingId = metadata?.booking_id;
  const userId = metadata?.user_id;

  console.log(`✅ Payout paid: ${id} for booking: ${bookingId}`);

  // 1. Update the payout status in payment_transactions
  await getSupabaseClient()`n    .from('payment_transactions')
    .update({
      status: 'succeeded',
      updated_at: new Date().toISOString(),
    })
    .eq('provider_session_id', id);

  // 2. Notify user about the successful payout
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payout',
    title: 'Payout Successful',
    body: 'Your payout has been processed successfully.',
    data: { link: `/dashboard/payouts`, bookingId: bookingId },
  });
}
