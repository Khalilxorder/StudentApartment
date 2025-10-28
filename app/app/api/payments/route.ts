// Payments API for Student Apartments
// Handles booking creation, payment processing, and Stripe webhooks
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { paymentsService } from '@/services/payments-svc';
import { z } from 'zod';
import Stripe from 'stripe';

// Booking creation schema
const bookingRequestSchema = z.object({
  apartmentId: z.string().uuid(),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  guestCount: z.number().min(1).max(10),
  specialRequests: z.string().optional(),
});

// Create booking endpoint
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate request
    const validatedData = bookingRequestSchema.parse(body);
    const { apartmentId, checkInDate, checkOutDate, guestCount, specialRequests } = validatedData;

    // Create booking
    const booking = await paymentsService.createBooking({
      apartmentId,
      tenantId: user.id,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guestCount,
      specialRequests,
    });

    return NextResponse.json({
      booking,
      paymentIntent: {
        clientSecret: booking.paymentIntentId, // This should be the client secret from the payment intent
      },
    });

  } catch (error) {
    console.error('Booking creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid booking parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create booking' },
      { status: 500 }
    );
  }
}

// Get booking details
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);

    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing bookingId parameter' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking
    const booking = await paymentsService.getBooking(bookingId);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user is tenant or owner
    if (booking.tenantId !== user.id && booking.ownerId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      { error: 'Failed to get booking' },
      { status: 500 }
    );
  }
}

// Stripe webhook handler
export async function PUT(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-09-30.clover',
    });

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    await paymentsService.handleWebhook(event);

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}