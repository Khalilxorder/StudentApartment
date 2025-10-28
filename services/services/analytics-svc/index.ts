// Analytics Service - User behavior tracking and KPI monitoring
// Integrates with PostHog for comprehensive analytics

export interface UserEvent {
  userId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  averageSessionDuration: number;
  topSearches: Array<{ term: string; count: number }>;
  popularLocations: Array<{ location: string; searches: number }>;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface ConversionFunnel {
  search: number;
  view: number;
  save: number;
  message: number;
  application: number;
}

export class AnalyticsService {
  private posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  private posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  async trackEvent(event: UserEvent): Promise<void> {
    try {
      // Send to PostHog
      await fetch(`${this.posthogHost}/capture/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.posthogKey,
          event: event.event,
          distinct_id: event.userId,
          properties: {
            ...event.properties,
            timestamp: event.timestamp.toISOString(),
          },
        }),
      });

      // Also store locally for custom metrics
      await this.storeLocalEvent(event);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  async trackSearch(userId: string, searchParams: {
    location?: string;
    budget?: { min: number; max: number };
    rooms?: number;
    university?: string;
    amenities?: string[];
  }): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'search_performed',
      properties: {
        ...searchParams,
        hasLocation: !!searchParams.location,
        hasBudget: !!searchParams.budget,
        hasRooms: !!searchParams.rooms,
        amenityCount: searchParams.amenities?.length || 0,
      },
      timestamp: new Date(),
    });
  }

  async trackApartmentView(userId: string, apartmentId: string, source: string): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'apartment_viewed',
      properties: {
        apartmentId,
        source, // 'search', 'saved', 'recommended', etc.
      },
      timestamp: new Date(),
    });
  }

  async trackApartmentSave(userId: string, apartmentId: string): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'apartment_saved',
      properties: {
        apartmentId,
      },
      timestamp: new Date(),
    });
  }

  async trackMessageSent(userId: string, recipientId: string, apartmentId: string): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'message_sent',
      properties: {
        recipientId,
        apartmentId,
      },
      timestamp: new Date(),
    });
  }

  async trackConversion(userId: string, conversionType: string, value?: number): Promise<void> {
    await this.trackEvent({
      userId,
      event: 'conversion',
      properties: {
        conversionType, // 'application', 'reservation', 'rental'
        value,
      },
      timestamp: new Date(),
    });
  }

  async getMetrics(timeRange: { start: Date; end: Date }): Promise<AnalyticsMetrics> {
    // In production, this would query analytics database
    // For now, return mock data structure

    return {
      totalUsers: 1250,
      activeUsers: 340,
      conversionRate: 0.12,
      averageSessionDuration: 8.5,
      topSearches: [
        { term: 'district 5', count: 45 },
        { term: 'under 150k', count: 38 },
        { term: 'near ELTE', count: 32 },
      ],
      popularLocations: [
        { location: 'District 5', searches: 156 },
        { location: 'District 6', searches: 98 },
        { location: 'District 7', searches: 87 },
      ],
      userRetention: {
        day1: 0.85,
        day7: 0.62,
        day30: 0.34,
      },
    };
  }

  async getConversionFunnel(timeRange: { start: Date; end: Date }): Promise<ConversionFunnel> {
    // Mock conversion funnel data
    return {
      search: 1000,
      view: 450,
      save: 180,
      message: 95,
      application: 42,
    };
  }

  async getUserJourney(userId: string): Promise<UserEvent[]> {
    // Retrieve user event history
    // In production, this would query from database
    return [];
  }

  async generateReport(reportType: 'daily' | 'weekly' | 'monthly'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (reportType) {
      case 'daily':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const metrics = await this.getMetrics({ start: startDate, end: now });
    const funnel = await this.getConversionFunnel({ start: startDate, end: now });

    return {
      period: reportType,
      startDate,
      endDate: now,
      metrics,
      funnel,
      generatedAt: new Date(),
    };
  }

  private async storeLocalEvent(event: UserEvent): Promise<void> {
    // Store in Supabase for custom analytics
    // This could be used for complex queries not available in PostHog
    try {
      // Placeholder - would use Supabase client
      console.log('Storing event locally:', event);
    } catch (error) {
      console.error('Failed to store local event:', error);
    }
  }

  // A/B Testing support
  async getExperimentVariant(userId: string, experimentName: string): Promise<string> {
    // Simple A/B testing implementation
    const hash = this.simpleHash(userId + experimentName);
    return hash % 2 === 0 ? 'control' : 'variant';
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const analyticsService = new AnalyticsService();