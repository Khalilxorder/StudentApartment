import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

interface DigestPreferencesRequest {
  userId: string;
  frequency: 'daily' | 'weekly' | 'never';
  categories?: string[];
  preferredTime?: string; // HH:mm format
}

/**
 * GET /api/digests/preferences
 * Get user digest preferences
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseClient()`n      .from('digest_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Return default preferences if not found
      return NextResponse.json({
        success: true,
        preferences: {
          user_id: userId,
          frequency: 'weekly',
          categories: ['new_listings', 'price_drops', 'saved_searches'],
          preferred_time: '09:00',
          enabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error('Error fetching digest preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch digest preferences' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/digests/preferences
 * Save or update digest preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DigestPreferencesRequest;
    const {
      userId,
      frequency,
      categories,
      preferredTime = '09:00',
    } = body;

    if (!userId || !frequency) {
      return NextResponse.json(
        { error: 'userId and frequency are required' },
        { status: 400 }
      );
    }

    // Check if preferences exist
    const { data: existing } = await getSupabaseClient()`n      .from('digest_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await getSupabaseClient()`n        .from('digest_preferences')
        .update({
          frequency,
          categories: categories || ['new_listings', 'price_drops'],
          preferred_time: preferredTime,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      result = { data, error };
    } else {
      // Create new
      const { data, error } = await getSupabaseClient()`n        .from('digest_preferences')
        .insert({
          user_id: userId,
          frequency,
          categories: categories || ['new_listings', 'price_drops'],
          preferred_time: preferredTime,
          enabled: frequency !== 'never',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Digest preferences saved',
      preferences: result.data,
    });
  } catch (error) {
    console.error('Error saving digest preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save digest preferences' },
      { status: 500 }
    );
  }
}
