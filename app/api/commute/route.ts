import { NextRequest, NextResponse } from 'next/server';
import { commuteService } from '@/services/commute-svc';

// GET /api/commute?apartmentId=123&universityId=elte&mode=transit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get('apartmentId');
    const universityId = searchParams.get('universityId');
    const mode = searchParams.get('mode') as 'walking' | 'bicycling' | 'transit' | 'driving' || 'transit';

    if (!apartmentId || !universityId) {
      return NextResponse.json(
        { error: 'apartmentId and universityId are required' },
        { status: 400 }
      );
    }

    // Get apartment location from database
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: apartment, error } = await getSupabaseClient()`n      .from('apartments')
      .select('latitude, longitude')
      .eq('id', apartmentId)
      .single();

    if (error || !apartment) {
      return NextResponse.json(
        { error: 'Apartment not found' },
        { status: 404 }
      );
    }

    const result = await commuteService.calculateCommute(
      { lat: apartment.latitude, lng: apartment.longitude },
      universityId,
      mode,
      apartmentId
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Could not calculate commute' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        apartmentId,
        universityId,
      },
    });

  } catch (error) {
    console.error('Commute API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate commute' },
      { status: 500 }
    );
  }
}

// POST /api/commute/batch - Calculate commutes for multiple apartments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apartmentIds, universityId, mode } = body;

    if (!apartmentIds || !Array.isArray(apartmentIds) || !universityId) {
      return NextResponse.json(
        { error: 'apartmentIds array and universityId are required' },
        { status: 400 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get apartment locations
    const { data: apartments, error } = await getSupabaseClient()`n      .from('apartments')
      .select('id, latitude, longitude')
      .in('id', apartmentIds);

    if (error || !apartments) {
      return NextResponse.json(
        { error: 'Failed to fetch apartments' },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      apartments.map(async (apartment) => {
        const result = await commuteService.calculateCommute(
          { lat: apartment.latitude, lng: apartment.longitude },
          universityId,
          mode || 'transit',
          apartment.id
        );

        return result ? {
          ...result,
          apartmentId: apartment.id,
          universityId,
        } : null;
      })
    );

    return NextResponse.json({
      success: true,
      data: results.filter(Boolean),
    });

  } catch (error) {
    console.error('Batch commute API error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate commutes' },
      { status: 500 }
    );
  }
}
