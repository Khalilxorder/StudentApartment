/**
 * GET /api/verification/status
 * Get verification status for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { data: { user }, error: authError } = await getSupabaseClient().auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's verifications
    const { data: verifications, error } = await getSupabaseClient()`n      .from('verifications')
      .select(`
        id,
        document_type,
        document_number,
        expiry_date,
        issuing_country,
        documents,
        status,
        submitted_at,
        reviewed_at,
        reviewer_notes,
        rejection_reason
      `)
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Verification status error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to get verification status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verifications: verifications || [],
    });
  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}