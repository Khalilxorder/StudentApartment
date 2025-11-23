import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function PATCH(request: NextRequest) {
  try {
    const { reportId, status, notes } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Missing reportId or status' }, { status: 400 });
    }

    // Update the report status
    const { error: reportError } = await supabase
      .from('user_reports')
      .update({
        status,
        resolved_at: new Date().toISOString(),
        admin_notes: notes,
      })
      .eq('id', reportId);

    if (reportError) {
      console.error('Error updating report:', reportError);
      return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
    }

    // If the report is resolved, potentially update trust scores or take other actions
    if (status === 'resolved') {
      // Get the report details to potentially penalize the reported user
      const { data: report } = await supabase
        .from('user_reports')
        .select('target_user_id, severity')
        .eq('id', reportId)
        .single();

      if (report) {
        // Decrease trust score for the reported user
        const penalty = report.severity === 'high' ? 10 : report.severity === 'medium' ? 5 : 2;

        await supabase.rpc('update_trust_score', {
          p_user_id: report.target_user_id,
          p_score_change: -penalty,
        });
      }
    }

    // Log the admin action
    await supabase
      .from('audit_logs')
      .insert({
        action: `report_${status}`,
        details: { report_id: reportId, admin_notes: notes },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in admin reports PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}