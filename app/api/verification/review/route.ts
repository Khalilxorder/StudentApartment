/**
 * PUT /api/verification/review
 * Review and update verification status (Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-build-safe';
import { logger } from '@/lib/logger';

function getSupabase() {
  return getSupabaseClient();
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { verificationId, status, reviewerNotes, rejectionReason } = body;

    // Validate required fields
    if (!verificationId || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['approved', 'rejected', 'pending'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Update verification
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    };

    if (reviewerNotes) {
      updateData.reviewer_notes = reviewerNotes;
    }

    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }

    const { data: verification, error } = await supabase
      .from('verification')
      .update(updateData)
      .eq('id', verificationId)
      .select()
      .single();

    if (error) {
      logger.error({ error, verificationId }, 'Verification review update failed');
      return NextResponse.json(
        { success: false, error: 'Failed to update verification' },
        { status: 500 }
      );
    }

    // If approved, update user verification status
    if (status === 'approved') {
      await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
        })
        .eq('id', verification.user_id);
    }

    return NextResponse.json({
      success: true,
      verification,
    });
  } catch (error) {
    logger.error({ error }, 'Verification review error');
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}