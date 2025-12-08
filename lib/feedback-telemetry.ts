import { createClient } from '@/lib/supabase/server';

export interface FeedbackEvent {
  eventType: 'search' | 'click' | 'save' | 'contact' | 'view' | 'compare' | 'booking';
  userId?: string;
  sessionId: string;
  apartmentId?: string;
  searchQuery?: string;
  searchFilters?: Record<string, any>;
  resultPosition?: number;
  resultCount?: number;
  aiScore?: number;
  aiReasoning?: string;
  timeSpentMs?: number;
  metadata?: Record<string, any>;
}

export interface FeedbackSummary {
  totalSearches: number;
  totalClicks: number;
  clickThroughRate: number;
  avgResultsClicked: number;
  topSearchTerms: Array<{ term: string; count: number }>;
  popularDistricts: Array<{ district: number; count: number }>;
  priceRangeDistribution: Array<{ range: string; count: number }>;
  conversionFunnel: {
    searches: number;
    clicks: number;
    saves: number;
    contacts: number;
    bookings: number;
  };
}

/**
 * Store feedback event in the database for analytics
 */
export async function storeFeedbackEvent(event: FeedbackEvent): Promise<boolean> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('feedback_events')
      .insert({
        event_type: event.eventType,
        user_id: event.userId || null,
        session_id: event.sessionId,
        apartment_id: event.apartmentId || null,
        search_query: event.searchQuery || null,
        search_filters: event.searchFilters || null,
        result_position: event.resultPosition || null,
        result_count: event.resultCount || null,
        ai_score: event.aiScore || null,
        ai_reasoning: event.aiReasoning || null,
        time_spent_ms: event.timeSpentMs || null,
        metadata: event.metadata || null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error storing feedback event:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to store feedback event:', error);
    return false;
  }
}

/**
 * Get feedback summary for analytics dashboard
 */
export async function getFeedbackSummary(
  timeframe: '24h' | '7d' | '30d' | '90d' = '30d'
): Promise<FeedbackSummary | null> {
  try {
    const supabase = createClient();
    
    const timeframeMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };
    
    const days = timeframeMap[timeframe];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all events in timeframe
    const { data: events, error } = await supabase
      .from('feedback_events')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('Error fetching feedback events:', error);
      return null;
    }

    if (!events || events.length === 0) {
      return {
        totalSearches: 0,
        totalClicks: 0,
        clickThroughRate: 0,
        avgResultsClicked: 0,
        topSearchTerms: [],
        popularDistricts: [],
        priceRangeDistribution: [],
        conversionFunnel: {
          searches: 0,
          clicks: 0,
          saves: 0,
          contacts: 0,
          bookings: 0,
        },
      };
    }

    // Calculate metrics
    const searches = events.filter(e => e.event_type === 'search');
    const clicks = events.filter(e => e.event_type === 'click');
    const saves = events.filter(e => e.event_type === 'save');
    const contacts = events.filter(e => e.event_type === 'contact');
    const bookings = events.filter(e => e.event_type === 'booking');

    // Search term frequency
    const searchTermCounts = new Map<string, number>();
    searches.forEach(s => {
      if (s.search_query) {
        const term = s.search_query.toLowerCase().trim();
        searchTermCounts.set(term, (searchTermCounts.get(term) || 0) + 1);
      }
    });

    const topSearchTerms = Array.from(searchTermCounts.entries())
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // District popularity
    const districtCounts = new Map<number, number>();
    events.forEach(e => {
      if (e.search_filters?.district) {
        const district = parseInt(e.search_filters.district);
        if (!isNaN(district)) {
          districtCounts.set(district, (districtCounts.get(district) || 0) + 1);
        }
      }
    });

    const popularDistricts = Array.from(districtCounts.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Price range distribution
    const priceRanges = [
      { min: 0, max: 150000, label: 'Under 150k' },
      { min: 150000, max: 250000, label: '150k-250k' },
      { min: 250000, max: 350000, label: '250k-350k' },
      { min: 350000, max: 500000, label: '350k-500k' },
      { min: 500000, max: Infinity, label: 'Over 500k' },
    ];

    const priceRangeDistribution = priceRanges.map(range => {
      const count = events.filter(e => {
        const maxPrice = e.search_filters?.max_price;
        if (!maxPrice) return false;
        return maxPrice >= range.min && maxPrice < range.max;
      }).length;
      return { range: range.label, count };
    });

    // Calculate CTR
    const uniqueSearchSessions = new Set(searches.map(s => s.session_id)).size;
    const clickedSessions = new Set(clicks.map(c => c.session_id)).size;
    const clickThroughRate = uniqueSearchSessions > 0 
      ? (clickedSessions / uniqueSearchSessions) * 100 
      : 0;

    // Average results clicked per session
    const clicksBySession = new Map<string, number>();
    clicks.forEach(c => {
      clicksBySession.set(c.session_id, (clicksBySession.get(c.session_id) || 0) + 1);
    });
    const avgResultsClicked = clicksBySession.size > 0
      ? Array.from(clicksBySession.values()).reduce((a, b) => a + b, 0) / clicksBySession.size
      : 0;

    return {
      totalSearches: searches.length,
      totalClicks: clicks.length,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      avgResultsClicked: Math.round(avgResultsClicked * 100) / 100,
      topSearchTerms,
      popularDistricts,
      priceRangeDistribution,
      conversionFunnel: {
        searches: searches.length,
        clicks: clicks.length,
        saves: saves.length,
        contacts: contacts.length,
        bookings: bookings.length,
      },
    };
  } catch (error) {
    console.error('Failed to get feedback summary:', error);
    return null;
  }
}

/**
 * Track AI search quality metrics
 */
export async function trackAISearchQuality(
  searchQuery: string,
  results: Array<{ id: string; aiScore?: number; position: number }>,
  sessionId: string,
  userId?: string
): Promise<void> {
  try {
    await storeFeedbackEvent({
      eventType: 'search',
      sessionId,
      userId,
      searchQuery,
      resultCount: results.length,
      metadata: {
        avgAiScore: results.reduce((sum, r) => sum + (r.aiScore || 0), 0) / results.length,
        topResultIds: results.slice(0, 5).map(r => r.id),
      },
    });
  } catch (error) {
    console.error('Failed to track AI search quality:', error);
  }
}

/**
 * Track when user clicks on a search result
 */
export async function trackResultClick(
  apartmentId: string,
  position: number,
  searchQuery: string,
  aiScore: number | undefined,
  sessionId: string,
  userId?: string
): Promise<void> {
  try {
    await storeFeedbackEvent({
      eventType: 'click',
      sessionId,
      userId,
      apartmentId,
      searchQuery,
      resultPosition: position,
      aiScore,
    });
  } catch (error) {
    console.error('Failed to track result click:', error);
  }
}
