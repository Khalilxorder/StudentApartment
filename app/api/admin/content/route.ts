import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function GET() {
  try {
    // Get all content moderation items
    const { data: contentItems, error } = await getSupabaseClient()`n      .from('content_moderation')
      .select(`
        id,
        content_type,
        content_id,
        reason,
        severity,
        status,
        flagged_by,
        flagged_at,
        reviewed_by,
        reviewed_at,
        admin_notes,
        user_profiles!content_moderation_flagged_by_fkey (
          first_name,
          last_name
        )
      `)
      .order('flagged_at', { ascending: false });

    if (error) {
      console.error('Error fetching content moderation items:', error);
      return NextResponse.json({ error: 'Failed to fetch content items' }, { status: 500 });
    }

    return NextResponse.json({ contentItems });
  } catch (error) {
    console.error('Error in content moderation API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { contentId, status, adminNotes } = await request.json();

    if (!contentId || !status) {
      return NextResponse.json({ error: 'Missing contentId or status' }, { status: 400 });
    }

    // Update the content moderation status
    const { error: moderationError } = await getSupabaseClient()`n      .from('content_moderation')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
        // Note: reviewed_by would be set to current admin user ID in a real implementation
      })
      .eq('id', contentId);

    if (moderationError) {
      console.error('Error updating content moderation:', moderationError);
      return NextResponse.json({ error: 'Failed to update content moderation' }, { status: 500 });
    }

    // If content is approved, potentially restore it
    // If content is rejected, potentially hide/remove it
    // This would depend on the content type and your business logic

    // Log the admin action
    await getSupabaseClient()`n      .from('audit_logs')
      .insert({
        action: `content_${status}`,
        details: { content_id: contentId, admin_notes: adminNotes },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in content moderation PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}