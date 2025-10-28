// Search Telemetry Service
// Tracks search behavior, A/B tests, user interactions, and performance metrics

import { createClient, createServiceClient } from '@/utils/supabaseClient';

export interface SearchTelemetryEvent {
  userId: string;
  sessionId: string;
  eventType: 'search_query' | 'filter_applied' | 'result_viewed' | 'apartment_clicked' | 'search_refined';
  query?: string;
  filters?: Record<string, any>;
  resultPosition?: number;
  apartmentId?: string;
  timestamp: Date;
  duration?: number; // in ms
  resultCount?: number;
}

export interface SearchSessionMetrics {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  queryCount: number;
  avgQueryLatency: number;
  clickThroughRate: number;
  apartmentClicks: string[];
  finalConversion?: 'booking' | 'contact' | 'none';
}

export interface ABTestVariant {
  name: string;
  description: string;
  allocation: number; // 0-100 percentage
  active: boolean;
  config: Record<string, any>;
}

export interface SearchPerformanceMetrics {
  timestamp: Date;
  totalRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorRate: number;
  cacheHitRate: number;
}

export class SearchTelemetryService {
  private sessions = new Map<string, SearchSessionMetrics>();
  private performanceMetrics: SearchPerformanceMetrics[] = [];
  private abTests: Map<string, ABTestVariant> = new Map();
  private latencies: number[] = [];

  constructor() {
    // Initialize with common A/B test variants
    this.abTests.set('ranking_v1', {
      name: 'Original Ranking',
      description: 'Thompson sampling with user feedback',
      allocation: 50,
      active: true,
      config: { algorithm: 'thompson_sampling' },
    });

    this.abTests.set('ranking_v2', {
      name: 'Enhanced Ranking',
      description: 'ML-based ranking with behavioral signals',
      allocation: 50,
      active: true,
      config: { algorithm: 'ml_ranking', features: ['user_behavior', 'click_through', 'dwell_time'] },
    });

    this.abTests.set('ui_layout_a', {
      name: 'Standard Layout',
      description: 'Traditional grid layout',
      allocation: 50,
      active: true,
      config: { layout: 'grid', columns: 3 },
    });

    this.abTests.set('ui_layout_b', {
      name: 'Compact Layout',
      description: 'Compact card layout with more results per page',
      allocation: 50,
      active: true,
      config: { layout: 'compact', columns: 4 },
    });
  }

  async trackSearchEvent(event: SearchTelemetryEvent): Promise<void> {
    try {
      const supabase = createServiceClient();

      // Store event in database
      await supabase.from('search_events').insert({
        user_id: event.userId,
        session_id: event.sessionId,
        event_type: event.eventType,
        query: event.query,
        filters: event.filters,
        result_position: event.resultPosition,
        apartment_id: event.apartmentId,
        duration: event.duration,
        result_count: event.resultCount,
        created_at: event.timestamp.toISOString(),
      });

      // Update in-memory session metrics
      if (!this.sessions.has(event.sessionId)) {
        this.sessions.set(event.sessionId, {
          sessionId: event.sessionId,
          userId: event.userId,
          startTime: event.timestamp,
          queryCount: 0,
          avgQueryLatency: 0,
          clickThroughRate: 0,
          apartmentClicks: [],
        });
      }

      const session = this.sessions.get(event.sessionId)!;

      if (event.eventType === 'search_query' && event.duration) {
        session.queryCount++;
        session.avgQueryLatency = (session.avgQueryLatency * (session.queryCount - 1) + event.duration) / session.queryCount;
      }

      if (event.eventType === 'apartment_clicked' && event.apartmentId) {
        session.apartmentClicks.push(event.apartmentId);
        session.clickThroughRate = session.apartmentClicks.length / (session.queryCount || 1);
      }

      if (event.duration) {
        this.latencies.push(event.duration);
        if (this.latencies.length > 10000) {
          this.latencies.shift();
        }
      }
    } catch (error) {
      console.error('Failed to track search event:', error);
    }
  }

  async trackSessionConversion(
    sessionId: string,
    conversionType: 'booking' | 'contact' | 'none'
  ): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.finalConversion = conversionType;
        session.endTime = new Date();

        // Store session end in database
        const supabase = createServiceClient();
        await supabase.from('search_sessions').insert({
          session_id: sessionId,
          user_id: session.userId,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime.toISOString(),
          query_count: session.queryCount,
          avg_query_latency: session.avgQueryLatency,
          click_through_rate: session.clickThroughRate,
          apartment_clicks: session.apartmentClicks,
          conversion_type: conversionType,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to track session conversion:', error);
    }
  }

  getABTestVariant(testName: string, userId: string): ABTestVariant | null {
    const test = this.abTests.get(testName);
    if (!test || !test.active) {
      return null;
    }

    // Deterministic variant assignment based on user ID
    const hash = this.hashUserId(userId);
    const normalized = (hash % 100) + 1;

    return normalized <= test.allocation ? test : null;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  async getPerformanceMetrics(period: '1h' | '24h' | '7d' = '24h'): Promise<SearchPerformanceMetrics> {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const totalRequests = this.latencies.length;

    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedLatencies.length) - 1;
      return sortedLatencies[Math.max(0, index)] || 0;
    };

    return {
      timestamp: new Date(),
      totalRequests,
      averageLatency: sortedLatencies.length > 0
        ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
        : 0,
      p50Latency: getPercentile(50),
      p95Latency: getPercentile(95),
      p99Latency: getPercentile(99),
      errorRate: 0.02, // Placeholder: would track actual errors
      cacheHitRate: 0.75, // Placeholder: would track cache hits
    };
  }

  async getUserSearchBehavior(
    userId: string,
    timeframe: '7d' | '30d' | '90d' = '30d'
  ): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    avgSessionDuration: number;
    conversionRate: number;
    favoriteAmenities: string[];
    priceRangePreference: { min: number; max: number };
  }> {
    try {
      const supabase = createServiceClient();
      const startDate = new Date();
      switch (timeframe) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default: // 30d
          startDate.setDate(startDate.getDate() - 30);
      }

      // Fetch search events
      const { data: events } = await supabase
        .from('search_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (!events || events.length === 0) {
        return {
          totalSearches: 0,
          uniqueQueries: 0,
          avgSessionDuration: 0,
          conversionRate: 0,
          favoriteAmenities: [],
          priceRangePreference: { min: 0, max: 0 },
        };
      }

      // Analyze patterns
      const uniqueQueries = new Set(events.map(e => e.query).filter(Boolean));
      const amenitiesFreq: Record<string, number> = {};
      const prices: number[] = [];

      events.forEach(event => {
        if (event.filters?.amenities) {
          event.filters.amenities.forEach((amenity: string) => {
            amenitiesFreq[amenity] = (amenitiesFreq[amenity] || 0) + 1;
          });
        }
        if (event.filters?.budget) {
          prices.push((event.filters.budget.min + event.filters.budget.max) / 2);
        }
      });

      // Calculate metrics
      const sessions = new Set(events.map(e => e.session_id));
      const sessionDurations = Array.from(sessions).map(sessionId => {
        const sessionEvents = events.filter(e => e.session_id === sessionId);
        const firstEvent = sessionEvents[0];
        const lastEvent = sessionEvents[sessionEvents.length - 1];
        return new Date(lastEvent.created_at).getTime() - new Date(firstEvent.created_at).getTime();
      });

      const { data: conversions } = await supabase
        .from('search_sessions')
        .select('conversion_type')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString());

      const conversionCount = conversions?.filter(c => c.conversion_type !== 'none').length || 0;

      return {
        totalSearches: events.length,
        uniqueQueries: uniqueQueries.size,
        avgSessionDuration: sessionDurations.length > 0
          ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
          : 0,
        conversionRate: conversions ? conversionCount / conversions.length : 0,
        favoriteAmenities: Object.entries(amenitiesFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([amenity]) => amenity),
        priceRangePreference:
          prices.length > 0
            ? {
              min: Math.min(...prices),
              max: Math.max(...prices),
            }
            : { min: 0, max: 0 },
      };
    } catch (error) {
      console.error('Failed to get user search behavior:', error);
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        avgSessionDuration: 0,
        conversionRate: 0,
        favoriteAmenities: [],
        priceRangePreference: { min: 0, max: 0 },
      };
    }
  }

  async getABTestMetrics(testName: string): Promise<{
    variant1: { name: string; conversionRate: number; avgSessionTime: number };
    variant2: { name: string; conversionRate: number; avgSessionTime: number };
    statisticalSignificance: number;
  }> {
    try {
      const supabase = createServiceClient();
      const test = this.abTests.get(testName);

      if (!test) {
        throw new Error(`Test ${testName} not found`);
      }

      // Fetch sessions tagged with this test
      const { data: sessions } = await supabase
        .from('search_sessions')
        .select('*')
        .filter('ab_test', 'eq', testName)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!sessions || sessions.length === 0) {
        return {
          variant1: { name: test.name, conversionRate: 0, avgSessionTime: 0 },
          variant2: { name: test.name, conversionRate: 0, avgSessionTime: 0 },
          statisticalSignificance: 0,
        };
      }

      // Split into variants based on deterministic assignment
      const variant1Sessions = sessions.filter(s => {
        const hash = this.hashUserId(s.user_id);
        return (hash % 100) + 1 <= 50;
      });

      const variant2Sessions = sessions.filter(s => {
        const hash = this.hashUserId(s.user_id);
        return (hash % 100) + 1 > 50;
      });

      const calculateMetrics = (sessionList: any[]) => {
        const conversions = sessionList.filter(s => s.conversion_type !== 'none').length;
        const conversionRate = sessionList.length > 0 ? conversions / sessionList.length : 0;
        const avgSessionTime = sessionList.length > 0
          ? sessionList.reduce((sum, s) => sum + (s.end_time ? new Date(s.end_time).getTime() - new Date(s.start_time).getTime() : 0), 0) / sessionList.length
          : 0;

        return { conversionRate, avgSessionTime };
      };

      const v1Metrics = calculateMetrics(variant1Sessions);
      const v2Metrics = calculateMetrics(variant2Sessions);

      // Simple statistical significance (p-value approximation)
      const significance = this.calculateSignificance(v1Metrics.conversionRate, variant1Sessions.length, v2Metrics.conversionRate, variant2Sessions.length);

      return {
        variant1: { name: test.name, ...v1Metrics },
        variant2: { name: test.name, ...v2Metrics },
        statisticalSignificance: significance,
      };
    } catch (error) {
      console.error('Failed to get A/B test metrics:', error);
      return {
        variant1: { name: 'Unknown', conversionRate: 0, avgSessionTime: 0 },
        variant2: { name: 'Unknown', conversionRate: 0, avgSessionTime: 0 },
        statisticalSignificance: 0,
      };
    }
  }

  private calculateSignificance(p1: number, n1: number, p2: number, n2: number): number {
    // Simplified z-test for proportion difference
    if (n1 === 0 || n2 === 0) return 0;

    const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to p-value (approximation)
    // p-value < 0.05 is statistically significant
    const pValue = 2 * (1 - this.normalCDF(z));

    return pValue;
  }

  private normalCDF(z: number): number {
    // Approximation of standard normal CDF
    return (1 + Math.tanh(Math.sqrt(Math.PI / 8) * z)) / 2;
  }
}

export const searchTelemetryService = new SearchTelemetryService();
