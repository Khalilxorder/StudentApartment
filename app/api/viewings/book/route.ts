import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabaseClient';
import { rateLimiter } from '@/lib/rate-limit';

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
      return NextResponse.json(
        { error: 'slotId is required' },
        { status: 400 }
      );
    }

    // Get slot details and check availability
    const { data: slot, error: slotError } = await supabase
      .from('viewing_slots')
      .select('*, apartments(title)')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      return NextResponse.json(
        { error: 'Viewing slot not found' },
        { status: 404 }
      );
    }

    // Check if slot is available
    const { data: isAvailable } = await supabase.rpc('is_viewing_slot_available', {
      slot_id: slotId,
    });

    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Viewing slot is not available' },
        { status: 409 }
      );
    }

    // Check if user already has a booking for this slot
    const { data: existingBooking } = await supabase
      .from('viewing_bookings')
      .select('id')
      .eq('viewing_slot_id', slotId)
      .eq('student_id', user.id)
      .single();

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You already have a booking for this slot' },
        { status: 409 }
      );
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('viewing_bookings')
      .insert({
        viewing_slot_id: slotId,
        student_id: user.id,
        notes,
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 400 });
    }

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
        }).catch(err => console.error('[viewing] Calendar integration error:', err));
      } catch (err) {
        console.error('[viewing] Failed to add calendar event:', err);
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
      }).catch(err => console.error('[viewing] Email sending error:', err));
    } catch (err) {
      console.error('[viewing] Failed to send confirmation email:', err);
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
    console.error('Error booking viewing:', error);
    return NextResponse.json(
      { error: 'Failed to book viewing' },
      { status: 500 }
    );
  }
}
