// Payment Intent API - Creates Stripe payment intent for booking
import { NextRequest, NextResponse } from 'next/server';
import { getStripe, STRIPE_CONFIG, isStripeConfigured } from '@/lib/stripe/server';
import { createClient } from '@/utils/supabaseClient';
import { bookingSchema, validateInput } from '@/lib/validation/schemas';
// import * as Sentry from '@sentry/nextjs'; // Temporarily disabled due to parsing error
import { logRequest, logResponse, logError, logEvent } from '@/lib/logger';

/**
 * @swagger
 * /api/payments/create-intent:
 *   post:
 *     summary: Create payment intent
 *     description: Creates a Stripe payment intent for booking
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [apartmentId, userId, move InDate]
 *             properties:
 *               apartmentId:
 *                 type: string
 *                 format: uuid
 *               userId:
 *                 type: string
 *                 format: uuid
 *               moveInDate:
 *                 type: string
 *                 format: date
 *               leaseMonths:
 *                 type: number
 *                 default: 12
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *                 bookingId:
 *                   type: string
 *                 amount:
 *                   type: number
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  logRequest('POST', '/api/payments/create-intent');

  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    logResponse('POST', '/api/payments/create-intent', 500, Date.now() - startTime);
    return NextResponse.json(
      { error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();

    // Validate input
    const validation = validateInput(bookingSchema, body);
    if (!validation.success) {
      logResponse('POST', '/api/payments/create-intent', 400, Date.now() - startTime);
      return NextResponse.json(
        { error: 'error' in validation ? validation.error : 'Validation failed' },
        { status: 400 }
      );
    }

    const { apartmentId, userId, moveInDate, leaseMonths } = validation.data;

    const supabase = createClient();

    // 1. Fetch apartment details
    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }

    // 2. Calculate amounts
    const depositMonths = apartment.deposit_months || 2;
    const depositAmount = apartment.price_huf * depositMonths;
    const firstMonthRent = apartment.price_huf;
    const totalAmount = depositAmount + firstMonthRent;

    // 3. Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        apartment_id: apartmentId,
        user_id: userId,
        owner_id: apartment.owner_id,
        move_in_date: moveInDate || new Date().toISOString(),
        lease_months: leaseMonths || 12,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        payment_status: 'unpaid',
        status: 'pending',
      })
      .select()
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError?.message },
        { status: 500 }
      );
    }

    // 4. Create Stripe Payment Intent
    const stripeClient = getStripe();
    if (!stripeClient) {
      logResponse('POST', '/api/payments/create-intent', 500, Date.now() - startTime);
      return NextResponse.json(
        { error: 'Stripe client not initialized' },
        { status: 500 }
      );
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(totalAmount), // Stripe requires integers (1 HUF = 1 unit)
      currency: STRIPE_CONFIG.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        booking_id: booking.id,
        apartment_id: apartmentId,
        user_id: userId,
        apartment_title: apartment.title,
      },
      description: `Booking for ${apartment.title} - ${depositMonths} months deposit + 1 month rent`,
    });

    if (!paymentIntent.client_secret) {
      logError(new Error('No client secret from Stripe'), {
        api_route: 'payment_intent',
        bookingId: booking.id,
      });
      return NextResponse.json(
        { error: 'Failed to initialize payment with Stripe' },
        { status: 500 }
      );
    }

    // 5. Store payment intent ID in booking
    await supabase
      .from('bookings')
      .update({ payment_intent_id: paymentIntent.id })
      .eq('id', booking.id);

    // 6. Create payment transaction record
    await supabase.from('payment_transactions').insert({
      booking_id: booking.id,
      owner_id: apartment.owner_id,
      tenant_id: userId,
      provider: 'stripe',
      provider_session_id: paymentIntent.id,
      amount_huf: totalAmount,
      currency: 'HUF',
      status: 'pending',
      metadata: {
        apartment_id: apartmentId,
        deposit_months: depositMonths,
        first_month_rent: firstMonthRent,
      },
    });

    // 7. Log success and return client secret to frontend
    logEvent('payment_intent_created', {
      bookingId: booking.id,
      apartmentId,
      amount: totalAmount,
    });

    logResponse('POST', '/api/payments/create-intent', 200, Date.now() - startTime);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      bookingId: booking.id,
      amount: totalAmount,
      breakdown: {
        deposit: depositAmount,
        firstMonth: firstMonthRent,
        depositMonths,
      },
    });
  } catch (error: any) {
    logError(error, {
      api_route: 'payment_intent',
      apartmentId: body?.apartmentId,
      userId: body?.userId,
    });

    // Sentry.captureException(error, {
    //   tags: { api_route: 'payment_intent' },
    //   extra: { apartmentId: body?.apartmentId, userId: body?.userId },
    // }); // Temporarily disabled due to parsing error

    logResponse('POST', '/api/payments/create-intent', 500, Date.now() - startTime);

    return NextResponse.json(
      { error: 'Payment initialization failed', details: error.message },
      { status: 500 }
    );
  }
}
