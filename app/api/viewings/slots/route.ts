import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

interface ViewingSlot {
  apartmentId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  capacity: number;
  notes?: string;
}

/**
 * GET /api/viewings/slots
 * List viewing slots for an apartment
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const apartmentId = searchParams.get('apartmentId');
    const status = searchParams.get('status') || 'available';

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'apartmentId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('viewing_slots')
      .select('*')
      .eq('apartment_id', apartmentId);

    if (status === 'available') {
      query = query.gt('end_time', new Date().toISOString());
    } else if (status === 'past') {
      query = query.lt('end_time', new Date().toISOString());
    }

    const { data, error } = await query.order('start_time', {
      ascending: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      slots: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching viewing slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch viewing slots' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/viewings/slots
 * Create a new viewing slot
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ViewingSlot;
    const { apartmentId, startTime, endTime, capacity, notes } = body;

    if (!apartmentId || !startTime || !endTime || !capacity) {
      return NextResponse.json(
        {
          error:
            'apartmentId, startTime, endTime, and capacity are required',
        },
        { status: 400 }
      );
    }

    // Verify apartment exists and user is owner
    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .select('owner_id')
      .eq('id', apartmentId)
      .single();

    if (aptError || !apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }

    if (apartment.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to create slots for this apartment' },
        { status: 403 }
      );
    }

    // Check for overlapping slots
    const { data: overlapping } = await supabase
      .from('viewing_slots')
      .select('*')
      .eq('apartment_id', apartmentId)
      .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Slot overlaps with existing viewing' },
        { status: 409 }
      );
    }

    // Create slot
    const { data: slot, error: createError } = await supabase
      .from('viewing_slots')
      .insert({
        apartment_id: apartmentId,
        owner_id: user.id,
        start_time: startTime,
        end_time: endTime,
        capacity,
        booked_count: 0,
        notes,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Viewing slot created',
        slot,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating viewing slot:', error);
    return NextResponse.json(
      { error: 'Failed to create viewing slot' },
      { status: 500 }
    );
  }
}
