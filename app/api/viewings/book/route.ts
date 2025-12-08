import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabaseClient';
import { rateLimiter } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { ApiErrors, successResponse } from '@/lib/api-response';

interface ViewingBookingRequest {
  slotId: string;
  notes?: string;
}

/**
 * POST /api/viewings/book
 * Book a viewing slot
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: max 10 booking attempts per hour per user
    const rateLimitResult = await rateLimiter.check(user.id, '/api/viewings/book', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Too many booking attempts. Please try again later.',
        retryAfter: Math.ceil(rateLimitResult.reset / 1000)
      }, {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.reset / 1000).toString()
        }
      });
    }

    const body = (await request.json()) as ViewingBookingRequest;
    const { slotId, notes } = body;

    if (!slotId) {
      return ApiErrors.badRequest('slotId is required');
    }

    // Use atomic RPC for race-condition-free booking
    const { data: bookingResult, error: rpcError } = await supabase.rpc('book_viewing_slot', {
      p_slot_id: slotId,
      p_student_id: user.id,
      p_notes: notes || null,
    });

    if (rpcError) {
      logger.error({ rpcError, slotId, userId: user.id }, 'Booking RPC failed');
      return ApiErrors.internalError('Failed to book viewing slot');
    }

    // Handle RPC response
    if (!bookingResult.success) {
      // Map RPC errors to appropriate HTTP responses
      const errorMsg = bookingResult.error as string;
      if (errorMsg.includes('not found')) {
        return ApiErrors.notFound('Viewing slot');
      }
      if (errorMsg.includes('not available')) {
        return ApiErrors.conflict('Viewing slot is no longer available');
      }
      if (errorMsg.includes('already have a booking')) {
        return ApiErrors.conflict('You already have a booking for this slot');
      }
      return ApiErrors.badRequest(errorMsg);
    }

    const booking = bookingResult.booking;

    // Get slot details for notifications (still needed for email/calendar)
    const { data: slot } = await supabase
      .from('viewing_slots')
      .select('*, apartments(title, address)')
      .eq('id', slotId)
      .single();

    // Send notification to owner
    await supabase.from('notifications').insert({
      user_id: slot.owner_id,
      type: 'viewing',
      title: 'New Viewing Booking',
      body: `A student has booked a viewing slot for ${slot.apartments?.title || 'your apartment'}`,
      data: { slotId, bookingId: booking.id },
    });

    // Integrate with calendar service (Google Calendar, iCal export)
    if (slot.start_time && slot.end_time) {
      const calendarEvent = {
        title: `Apartment Viewing: ${slot.apartments?.title || 'Your Apartment'}`,
        startTime: new Date(slot.start_time),
        endTime: new Date(slot.end_time),
        location: slot.apartments?.address || '',
        description: notes || 'Student apartment viewing',
        attendees: [
          { email: user.email, name: user.user_metadata?.full_name },
        ],
      };

      try {
        // Create calendar event (Google Calendar or iCal export)
        await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: calendarEvent,
            userId: user.id,
            ownerId: slot.owner_id,
            bookingId: booking.id,
          }),
        }).catch(err => logger.error({ err, userId: user.id }, '[viewing] Calendar integration error'));
      } catch (err) {
        logger.error({ err, userId: user.id }, '[viewing] Failed to add calendar event');
        // Don't fail the booking if calendar integration fails
      }
      // Don't fail the booking if calendar integration fails
    }

    // Send confirmation email via Resend
    try {
      const emailData = {
        studentEmail: user.email,
        studentName: user.user_metadata?.full_name || 'Student',
        ownerEmail: slot.owner_id, // Will fetch owner email
        apartmentTitle: slot.apartments?.title || 'Your Apartment',
        slotTime: new Date(slot.start_time).toLocaleString(),
        bookingId: booking.id,
        address: slot.apartments?.address || '',
        notes: notes || '',
      };

      // Send confirmation emails
      await fetch('/api/notifications/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'viewing_confirmation',
          data: emailData,
        }),
      }).catch(err => logger.error({ err, userId: user.id }, '[viewing] Email sending error'));
    } catch (err) {
      logger.error({ err, userId: user.id }, '[viewing] Failed to send confirmation email');
      // Don't fail the booking if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Viewing booked successfully',
        booking,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error({ error }, 'Error booking viewing');
    return NextResponse.json(
      { error: 'Failed to book viewing' },
      { status: 500 }
    );
  }
}
