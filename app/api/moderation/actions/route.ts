import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

interface ModerationActionRequest {
  reportId: string;
  action: 'approved' | 'rejected' | 'restricted';
  moderatorId: string;
  notes?: string;
  restrictionDuration?: number; // days
}

/**
 * POST /api/moderation/actions
 * Take action on a report
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ModerationActionRequest;
    const { reportId, action, moderatorId, notes, restrictionDuration = 30 } =
      body;

    if (!reportId || !action || !moderatorId) {
      return NextResponse.json(
        { error: 'reportId, action, and moderatorId are required' },
        { status: 400 }
      );
    }

    // Get report details
    const { data: report, error: reportError } = await getSupabaseClient()`n      .from('user_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Update report status
    const { error: updateError } = await getSupabaseClient()`n      .from('user_reports')
      .update({
        status: action,
        resolved_by: moderatorId,
        admin_notes: notes,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // If restricted, create user restriction
    if (action === 'restricted') {
      const restrictionUntil = new Date();
      restrictionUntil.setDate(restrictionUntil.getDate() + restrictionDuration);

      await getSupabaseClient().from('user_restrictions').insert({
        user_id: report.target_id,
        restriction_type: 'content_removed',
        reason: report.reason,
        restricted_until: restrictionUntil.toISOString(),
        created_by: moderatorId,
        created_at: new Date().toISOString(),
      });

      // Log moderation action
      await getSupabaseClient().from('moderation_logs').insert({
        action: 'user_restricted',
        target_user_id: report.target_id,
        moderator_id: moderatorId,
        reason: report.reason,
        metadata: {
          report_id: reportId,
          restriction_duration: restrictionDuration,
        },
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Report ${action}`,
      action_taken: action,
    });
  } catch (error) {
    console.error('Error taking moderation action:', error);
    return NextResponse.json(
      { error: 'Failed to take moderation action' },
      { status: 500 }
    );
  }
}
