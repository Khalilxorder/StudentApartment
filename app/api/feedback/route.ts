import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    const {
      eventType,
      sessionId,
      apartmentId,
      searchQuery,
      searchFilters,
      resultPosition,
      resultCount,
      aiScore,
      aiReasoning,
      timeSpentMs,
      metadata,
    } = body;

    if (!eventType || !sessionId) {
      return NextResponse.json(
        { error: 'eventType and sessionId are required' },
        { status: 400 }
      );
    }

    // Get user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('feedback_events')
      .insert({
        event_type: eventType,
        user_id: user?.id || null,
        session_id: sessionId,
        apartment_id: apartmentId || null,
        search_query: searchQuery || null,
        search_filters: searchFilters || null,
        result_position: resultPosition || null,
        result_count: resultCount || null,
        ai_score: aiScore || null,
        ai_reasoning: aiReasoning || null,
        time_spent_ms: timeSpentMs || null,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      // If table doesn't exist, just return success (non-critical feature)
      if (error.code === '42P01') {
        logger.warn('feedback_events table not found - skipping telemetry');
        return NextResponse.json({ success: true, skipped: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error({ error }, 'Feedback telemetry error');
    return NextResponse.json(
      { error: 'Failed to store feedback event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get timeframe from query params
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30d';

    const timeframeMap: Record<string, number> = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const days = timeframeMap[timeframe] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregated metrics
    const { data: events, error } = await supabase
      .from('feedback_events')
      .select('event_type, search_query, search_filters, session_id, created_at')
      .gte('created_at', startDate.toISOString());

    if (error) {
      // Table doesn't exist
      if (error.code === '42P01') {
        return NextResponse.json({
          totalSearches: 0,
          totalClicks: 0,
          clickThroughRate: 0,
          topSearchTerms: [],
          conversionFunnel: { searches: 0, clicks: 0, saves: 0, contacts: 0, bookings: 0 },
        });
      }
      throw error;
    }

    // Calculate metrics
    const searches = events?.filter(e => e.event_type === 'search') || [];
    const clicks = events?.filter(e => e.event_type === 'click') || [];
    const saves = events?.filter(e => e.event_type === 'save') || [];
    const contacts = events?.filter(e => e.event_type === 'contact') || [];
    const bookings = events?.filter(e => e.event_type === 'booking') || [];

    // Search term frequency
    const searchTermCounts = new Map<string, number>();
    searches.forEach((s: any) => {
      if (s.search_query) {
        const term = s.search_query.toLowerCase().trim();
        searchTermCounts.set(term, (searchTermCounts.get(term) || 0) + 1);
      }
    });

    const topSearchTerms = Array.from(searchTermCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate CTR
    const uniqueSearchSessions = new Set(searches.map((s: any) => s.session_id)).size;
    const clickedSessions = new Set(clicks.map((c: any) => c.session_id)).size;
    const clickThroughRate = uniqueSearchSessions > 0
      ? Math.round((clickedSessions / uniqueSearchSessions) * 100)
      : 0;

    return NextResponse.json({
      totalSearches: searches.length,
      totalClicks: clicks.length,
      clickThroughRate,
      topSearchTerms,
      conversionFunnel: {
        searches: searches.length,
        clicks: clicks.length,
        saves: saves.length,
        contacts: contacts.length,
        bookings: bookings.length,
      },
      timeframe,
    });
  } catch (error: any) {
    logger.error({ error }, 'Feedback analytics error');
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
