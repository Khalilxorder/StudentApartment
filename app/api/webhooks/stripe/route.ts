// Stripe Webhook Handler - Handles payment events
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/utils/supabaseClient';
// import * as Sentry from '@sentry/nextjs'; // Temporarily disabled due to parsing error
import type Stripe from 'stripe';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Create a Stripe instance at request-time for webhook signature verification
  // We prefer to use getStripe(), but construct a fresh instance if needed
  let stripeInstance = getStripe();
  if (!stripeInstance) {
    const StripeCtor = require('stripe').default as new (key: string, options: { apiVersion: string }) => import('stripe').Stripe;
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe secret not configured' }, { status: 500 });
    }
    stripeInstance = new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-06-20',
    });
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
    event = stripeInstance.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    logger.error({ err: err.message }, 'Webhook signature verification failed');
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
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    logger.error({ error, eventType: event?.type }, 'Webhook handler error');
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

  logger.info(`✅ Payment succeeded for booking: ${bookingId}`);

  // 1. Update booking status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'paid',
      status: 'approved',
      payment_method: 'stripe',
      payment_id: paymentIntent.id,
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
  const { data: booking } = await supabase
    .from('bookings')
    .select('owner_id, apartment_id, apartments(title)')
    .eq('id', bookingId)
    .single();

  if (booking && booking.owner_id) {
    const apartments = booking.apartments as { title?: string } | undefined;
    const apartmentTitle = apartments?.title || 'your apartment';
    await supabase.from('notifications').insert({
      user_id: booking.owner_id,
      type: 'booking',
      title: 'New Booking Confirmed',
      body: `Payment received for ${apartmentTitle}. Review the booking request.`,
      data: { link: `/owner/bookings`, bookingId, apartmentTitle },
    });
  }

  // 5. Send confirmation emails using email queue
  try {
    // Get user email for confirmation
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userProfile?.email) {
      // Dynamically import email queue to avoid build-time issues
      const { emailQueue } = await import('@/services/notify-svc/email-queue');

      // Send booking confirmation to renter
      const guestName = userProfile.full_name || 'Guest';
      await emailQueue.addEmailJob({
        to: userProfile.email,
        subject: 'Booking Confirmed - Student Apartments',
        html: `
          <h1>Booking Confirmed!</h1>
          <p>Dear ${guestName},</p>
          <p>Your booking (ID: ${bookingId}) has been confirmed.</p>
          <p>Payment of ${(paymentIntent.amount / 100).toLocaleString()} HUF has been processed successfully.</p>
          <p>You can view your booking details in your dashboard.</p>
          <p>Thank you for using Student Apartments!</p>
        `,
        tags: [{ name: 'type', value: 'booking-confirmation' }]
      });

      // Notify owner if available
      if (booking?.owner_id) {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', booking.owner_id)
          .single();

        if (ownerProfile?.email) {
          const apartmentTitle = (booking.apartments as { title?: string })?.title || 'your apartment';
          const ownerName = ownerProfile.full_name || 'Owner';
          await emailQueue.addEmailJob({
            to: ownerProfile.email,
            subject: 'New Booking Received - Student Apartments',
            html: `
              <h1>New Booking Received!</h1>
              <p>Dear ${ownerName},</p>
              <p>You have a new booking for ${apartmentTitle}.</p>
              <p>Payment of ${(paymentIntent.amount / 100).toLocaleString()} HUF has been received.</p>
              <p>Booking ID: ${bookingId}</p>
              <p>Please review the booking in your owner dashboard.</p>
            `,
            tags: [{ name: 'type', value: 'owner-booking-notification' }]
          });
        }
      }
      logger.info({ bookingId }, '📧 Confirmation emails queued successfully');
    }
  } catch (emailError) {
    // Don't fail the webhook if email fails - just log it
    logger.warn({ emailError, bookingId }, 'Failed to send confirmation emails');
  }

  logger.info(`📧 Notifications sent for booking: ${bookingId}`);
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createServiceClient();
  const metadata = paymentIntent.metadata || {};
  const bookingId = metadata.booking_id;
  const userId = metadata.user_id;

  logger.info(`❌ Payment failed for booking: ${bookingId}`);

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

  logger.info(`🚫 Payment canceled for booking: ${bookingId}`);

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
    .eq('provider_session_id', paymentIntent.id);
}

async function handlePayoutCreated(payout: Stripe.Payout) {
  const supabase = createServiceClient();
  const { id, amount, currency, metadata } = payout;
  const bookingId = metadata?.booking_id;
  const userId = metadata?.user_id;

  logger.info(`💰 Payout created: ${id} for booking: ${bookingId}`);

  // 1. Verify owner is verified before allowing payout
  if (!userId) {
    logger.error({ payoutId: id }, 'Payout blocked: No user ID in metadata');
    // Cancel the payout if no user ID
    const stripeClient = getStripe();
    if (stripeClient) await stripeClient.payouts.cancel(id);
    return;
  }

  // Check if owner has completed Stripe Connect verification
  const { data: stripeAccount, error: accountError } = await supabase
    .from('stripe_connect_accounts')
    .select('status, stripe_account_id')
    .eq('user_id', userId)
    .single();

  if (accountError || !stripeAccount) {
    logger.error({ userId }, 'Payout blocked: No Stripe Connect account');
    const stripeClient = getStripe();
    if (stripeClient) await stripeClient.payouts.cancel(id);
    return;
  }

  if (stripeAccount.status !== 'active') {
    logger.error({ userId, status: stripeAccount.status }, 'Payout blocked: Stripe account not verified');
    const stripeClient = getStripe();
    if (stripeClient) await stripeClient.payouts.cancel(id);
    return;
  }

  // Verify the Stripe account is still active in Stripe
  try {
    const stripeClient = getStripe();
    if (!stripeClient) throw new Error('Stripe not configured');
    const account = await stripeClient.accounts.retrieve(stripeAccount.stripe_account_id);
    if (!account.payouts_enabled) {
      logger.error({ stripeAccountId: stripeAccount.stripe_account_id }, 'Payout blocked: Payouts not enabled');
      await stripeClient.payouts.cancel(id);
      return;
    }
  } catch (error) {
    logger.error({ error, stripeAccountId: stripeAccount.stripe_account_id }, 'Payout blocked: Error verifying Stripe account');
    const stripeClient = getStripe();
    if (stripeClient) await stripeClient.payouts.cancel(id);
    return;
  }

  logger.info(`✅ Payout approved: Owner ${userId} is verified and payouts enabled`);

  // 2. Update booking status to paid
  if (bookingId) {
    await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
  }

  // 3. Create payment transaction record
  await supabase
    .from('payment_transactions')
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

  logger.info(`❌ Payout failed: ${id} for booking: ${bookingId}`);

  // 1. Update the payout status in payment_transactions
  await supabase
    .from('payment_transactions')
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

  logger.info(`✅ Payout paid: ${id} for booking: ${bookingId}`);

  // 1. Update the payout status in payment_transactions
  await supabase
    .from('payment_transactions')
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
