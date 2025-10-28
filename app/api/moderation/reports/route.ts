import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ContentReportRequest {
  reporterId: string;
  targetType: 'apartment' | 'user' | 'review' | 'message';
  targetId: string;
  reason: string;
  details?: string;
}

/**
 * GET /api/moderation/reports
 * List content reports (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data, error } = await supabase
      .from('user_reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      reports: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/moderation/reports
 * Create a new content report
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ContentReportRequest;
    const { reporterId, targetType, targetId, reason, details } = body;

    if (!reporterId || !targetType || !targetId || !reason) {
      return NextResponse.json(
        {
          error:
            'reporterId, targetType, targetId, and reason are required',
        },
        { status: 400 }
      );
    }

    // Check if already reported by same user
    const { data: existing } = await supabase
      .from('user_reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .eq('target_user_id', targetId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You have already reported this content' },
        { status: 409 }
      );
    }

    // Create report
    const { data: report, error: createError } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: reporterId,
        target_user_id: targetId,
        reason,
        details,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Report submitted successfully',
        report,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}
