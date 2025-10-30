import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';

// GET /api/saved-searches - Get user's saved searches
export async function GET(request: NextRequest) {
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

    const { data: savedSearches, error } = await getSupabaseClient()`n      .from('saved_searches')
      .select(`
        *,
        search_results (
          apartment_id,
          first_found_at
        ),
        search_analytics (
          total_alerts_sent,
          open_rate,
          click_rate
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved searches:', error);
      return NextResponse.json(
        { error: 'Failed to fetch saved searches' },
        { status: 500 }
      );
    }

    return NextResponse.json({ savedSearches: savedSearches || [] });

  } catch (error) {
    console.error('Saved searches API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/saved-searches - Create a new saved search
export async function POST(request: NextRequest) {
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
      alertFrequency
    } = body;

    // Create saved search
    const { data: savedSearch, error: insertError } = await getSupabaseClient()`n      .from('saved_searches')
      .insert({
        user_id: user.id,
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
        alert_frequency: alertFrequency || 'daily'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating saved search:', insertError);
      return NextResponse.json(
        { error: 'Failed to create saved search' },
        { status: 500 }
      );
    }

    // Run initial search to populate results
    const { data: initialResults } = await getSupabaseClient()`n      .rpc('run_saved_search', { target_search_id: savedSearch.id });

    return NextResponse.json({
      savedSearch,
      initialResultsCount: initialResults || 0
    }, { status: 201 });

  } catch (error) {
    console.error('Create saved search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}