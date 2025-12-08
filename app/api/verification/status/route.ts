/**
 * GET /api/verification/status
 * Get verification status for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-build-safe';
import { logger } from '@/lib/logger';

function getSupabase() {
  return getSupabaseClient();
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's verifications
    const { data: verifications, error } = await supabase
      .from('verification')
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
      logger.error({ error, userId: user.id }, 'Verification status query failed');
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
    logger.error({ error }, 'Verification status error');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}