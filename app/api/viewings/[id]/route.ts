import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

/**
 * GET /api/viewings/[id]
 * Get viewing booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    const { data: booking, error } = await supabase
      .from('viewing_bookings')
      .select(`
        *,
        viewing_slots(
          *,
          apartments(title, address)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Viewing booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to view this booking
    if (
      booking.student_id !== user.id &&
      booking.viewing_slots.owner_id !== user.id
    ) {
      return NextResponse.json(
        { error: 'Unauthorized to view this booking' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error('Error fetching viewing booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing booking' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/viewings/[id]
 * Cancel a viewing booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('viewing_bookings')
      .select('*, viewing_slots(owner_id)')
      .eq('id', id)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Viewing booking not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized to cancel this booking
    if (booking.student_id !== user.id && booking.viewing_slots.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this booking' },
        { status: 403 }
      );
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from('viewing_bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Viewing booking cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling viewing booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel viewing booking' },
      { status: 500 }
    );
  }
}
