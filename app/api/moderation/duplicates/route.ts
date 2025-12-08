import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { enhancedDuplicateDetectionService } from '@/services/duplicate-detection-svc';

/**
 * GET /api/moderation/duplicates?apartmentId=...
 * Detect duplicate listings for a specific apartment
 * Admin only
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in setting cookies
            }
          },
        },
      }
    );

    // Check authentication and admin role
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const apartmentId = searchParams.get('apartmentId');
    const method = (searchParams.get('method') as 'incremental' | 'full_scan') || 'incremental';

    if (!apartmentId) {
      return NextResponse.json(
        { error: 'apartmentId is required' },
        { status: 400 }
      );
    }

    // Run duplicate detection
    const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment(
      apartmentId,
      method
    );

    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error detecting duplicates:');
    return NextResponse.json(
      { error: 'Failed to detect duplicates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/moderation/duplicates/mark
 * Mark apartments as duplicates of each other
 * Admin only
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in setting cookies
            }
          },
        },
      }
    );

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { canonicalApartmentId, duplicateApartmentId, score, method } = body;

    if (!canonicalApartmentId || !duplicateApartmentId) {
      return NextResponse.json(
        { error: 'canonicalApartmentId and duplicateApartmentId are required' },
        { status: 400 }
      );
    }

    // Store the duplicate relationship
    const { error: insertError } = await supabase
      .from('apartment_duplicates')
      .upsert({
        canonical_apartment_id: canonicalApartmentId,
        duplicate_apartment_id: duplicateApartmentId,
        score: score || 0.5,
        detection_method: method || 'manual',
        detected_at: new Date().toISOString(),
      }, {
        onConflict: 'canonical_apartment_id,duplicate_apartment_id'
      });

    if (insertError) {
      logger.error({ err: insertError }, 'Error storing duplicate relationship:');
      return NextResponse.json(
        { error: 'Failed to store duplicate relationship' },
        { status: 500 }
      );
    }

    // Create a safety alert for moderation
    await supabase
      .from('audit_logs')
      .insert({
        event: 'duplicate_marked',
        resource_type: 'apartment_duplicate',
        resource_id: canonicalApartmentId,
        actor_id: user.id,
        metadata: {
          canonical_id: canonicalApartmentId,
          duplicate_id: duplicateApartmentId,
          score,
          method,
          timestamp: new Date().toISOString(),
        },
      });

    return NextResponse.json({
      success: true,
      message: 'Duplicate relationship recorded',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error marking duplicate:');
    return NextResponse.json(
      { error: 'Failed to mark duplicate' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/moderation/duplicates
 * Remove a duplicate relationship
 * Admin only
 */
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore errors in setting cookies
            }
          },
        },
      }
    );

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const canonicalApartmentId = searchParams.get('canonicalApartmentId');
    const duplicateApartmentId = searchParams.get('duplicateApartmentId');

    if (!canonicalApartmentId || !duplicateApartmentId) {
      return NextResponse.json(
        { error: 'canonicalApartmentId and duplicateApartmentId are required' },
        { status: 400 }
      );
    }

    // Delete the duplicate relationship
    const { error } = await supabase
      .from('apartment_duplicates')
      .delete()
      .eq('canonical_apartment_id', canonicalApartmentId)
      .eq('duplicate_apartment_id', duplicateApartmentId);

    if (error) {
      logger.error({ err: error }, 'Error deleting duplicate relationship:');
      return NextResponse.json(
        { error: 'Failed to delete duplicate relationship' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Duplicate relationship removed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting duplicate:');
    return NextResponse.json(
      { error: 'Failed to delete duplicate' },
      { status: 500 }
    );
  }
}
