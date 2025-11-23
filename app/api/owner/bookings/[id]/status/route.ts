import { createClient as createServerClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/utils/supabaseClient';
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16' as any,
});

const supabaseAdmin = createServiceClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = createServerClient();
    const { status, action, refundReason } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (!status || !['approved', 'rejected', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be approved, rejected, or cancelled' },
        { status: 400 }
      );
    }

    // Verify user from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking details scoped to owner
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('owner_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify that the user owns the apartment
    const { data: apartment } = await supabase
      .from('apartments')
      .select('owner_id, title')
      .eq('id', booking.apartment_id)
      .single();

    if (!apartment || apartment.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to manage this booking' },
        { status: 403 }
      );
    }

    let stripeAction = null;
    let paymentIntentId = booking.stripe_payment_intent_id;

    // Handle Stripe payment updates
    if (status === 'approved' && booking.status !== 'approved') {
      // Confirm payment intent
      if (paymentIntentId) {
        try {
          const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: booking.stripe_payment_method_id,
          });
          stripeAction = {
            type: 'confirmed',
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            status: paymentIntent.status,
          };
        } catch (stripeError: any) {
          console.error('Stripe confirmation error:', stripeError);
          return NextResponse.json(
            { success: false, error: 'Failed to confirm payment: ' + stripeError.message },
            { status: 400 }
          );
        }
      }
    } else if (status === 'cancelled' && booking.status !== 'cancelled') {
      // Process refund
      if (paymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            reason: (refundReason || 'requested_by_customer') as any,
          });
          stripeAction = {
            type: 'refunded',
            refundId: refund.id,
            amount: refund.amount,
            status: refund.status,
          };
        } catch (stripeError: any) {
          console.error('Stripe refund error:', stripeError);
          return NextResponse.json(
            { success: false, error: 'Failed to process refund: ' + stripeError.message },
            { status: 400 }
          );
        }
      }
    }

    // Update booking status
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: status,
        updated_at: new Date().toISOString(),
        stripe_action: stripeAction,
      })
      .eq('id', bookingId)
      .select();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update booking: ' + updateError.message },
        { status: 500 }
      );
    }

    // Create activity log entry
    await supabaseAdmin
      .from('booking_activity_log')
      .insert({
        booking_id: bookingId,
        action: status,
        actor_type: 'owner',
        actor_id: user.id,
        timestamp: new Date().toISOString(),
        details: {
          stripeAction,
          refundReason: refundReason || null,
        },
      });

    // Send notification email to tenant
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/booking-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          tenantEmail: booking.tenant_email,
          status,
          apartmentTitle: apartment?.title,
        }),
      });
    } catch (emailError) {
      console.error('Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking?.[0],
      message: `Booking ${status}`,
    });
  } catch (error: any) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get booking details scoped to owner
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('owner_id', user.id)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get activity log
    const { data: activityLog } = await supabaseAdmin
      .from('booking_activity_log')
      .select('*')
      .eq('booking_id', bookingId)
      .order('timestamp', { ascending: false });

    return NextResponse.json({
      success: true,
      booking,
      activityLog,
    });
  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
