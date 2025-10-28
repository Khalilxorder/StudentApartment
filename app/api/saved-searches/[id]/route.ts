import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

// GET /api/saved-searches/[id] - Get a specific saved search
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: savedSearch, error } = await supabase
      .from('saved_searches')
      .select(`
        *,
        search_results (
          apartment_id,
          first_found_at,
          viewed_at,
          favorited_at
        ),
        search_analytics (*)
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Saved search not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching saved search:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved search' },
        { status: 500 }
      );
    }

    return NextResponse.json({ savedSearch });

  } catch (error) {
    console.error('Get saved search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/saved-searches/[id] - Update a saved search
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      propertyTypes,
      amenities,
      location,
      locationRadius,
      petFriendly,
      furnished,
      parkingAvailable,
      emailAlertsEnabled,
      alertFrequency,
      isActive
    } = body;

    // Update saved search
    const { data: savedSearch, error: updateError } = await supabase
      .from('saved_searches')
      .update({
        name,
        description,
        min_price: minPrice,
        max_price: maxPrice,
        bedrooms,
        bathrooms,
        min_area_sqft: minArea,
        max_area_sqft: maxArea,
        property_types: propertyTypes || [],
        amenities: amenities || [],
        location_radius_miles: locationRadius || 10,
        pet_friendly: petFriendly,
        furnished,
        parking_available: parkingAvailable,
        email_alerts_enabled: emailAlertsEnabled !== false,
        alert_frequency: alertFrequency || 'daily',
        is_active: isActive !== false,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating saved search:', updateError);
      return NextResponse.json(
        { error: 'Failed to update saved search' },
        { status: 500 }
      );
    }

    if (!savedSearch) {
      return NextResponse.json(
        { error: 'Saved search not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ savedSearch });

  } catch (error) {
    console.error('Update saved search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/saved-searches/[id] - Delete a saved search
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { error: deleteError } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting saved search:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete saved search' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Saved search deleted successfully' });

  } catch (error) {
    console.error('Delete saved search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}