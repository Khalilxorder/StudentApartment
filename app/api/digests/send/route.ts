import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-load Supabase client
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

interface DigestSendRequest {
  userId: string;
  type: 'saved_searches' | 'price_drops' | 'new_listings' | 'weekly_summary';
}

/**
 * GET /api/digests/sends
 * Get digest send history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await getSupabaseClient()`n      .from('digest_sends')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      sends: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching digest sends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch digest sends' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/digests/send
 * Manually trigger or queue digest send
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DigestSendRequest;
    const { userId, type = 'weekly_summary' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user preferences
    const { data: preferences } = await getSupabaseClient()`n      .from('digest_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!preferences || !preferences.enabled) {
      return NextResponse.json(
        { error: 'User has disabled digests' },
        { status: 400 }
      );
    }

    // Get user email
    const { data: user } = await getSupabaseClient()`n      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // TODO: Build digest content based on type
    // For now, create the send record
    const { data: send, error: sendError } = await getSupabaseClient()`n      .from('digest_sends')
      .insert({
        user_id: userId,
        digest_type: type,
        status: 'pending',
        recipient_email: user.email,
        content: {
          template: type,
          generated_at: new Date().toISOString(),
        },
        sent_at: null,
        opened_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sendError) {
      return NextResponse.json(
        { error: sendError.message },
        { status: 400 }
      );
    }

    // TODO: Queue for sending via Resend or similar email service
    // await emailQueue.add('send-digest', {
    //   sendId: send.id,
    //   userId,
    //   email: user.email,
    //   type,
    // });

    return NextResponse.json(
      {
        success: true,
        message: 'Digest queued for sending',
        send,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error sending digest:', error);
    return NextResponse.json(
      { error: 'Failed to send digest' },
      { status: 500 }
    );
  }
}
