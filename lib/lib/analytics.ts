// FILE: lib/analytics.ts

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

interface AnalyticsEvent {
  event: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  properties?: Record<string, any>;
  page?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface GoogleAnalyticsConfig {
  measurementId: string;
  debug?: boolean;
}

interface MarketingAttribution {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  gclid?: string;
  fbclid?: string;
}

interface ABTestVariant {
  testId: string;
  variantId: string;
  experimentName: string;
}

interface ConversionEvent {
  event: string;
  value?: number;
  currency?: string;
  items?: Array<{
    item_id: string;
    item_name: string;
    category: string;
    price?: number;
    quantity?: number;
  }>;
}

class AnalyticsService {
  private sessionId: string;
  private events: AnalyticsEvent[] = [];
  private isInitialized = false;
  private googleAnalyticsConfig?: GoogleAnalyticsConfig;
  private marketingAttribution?: MarketingAttribution;
  private abTestVariants: ABTestVariant[] = [];
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredData();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredData() {
    try {
      // Only access localStorage on the client side
      if (typeof window === 'undefined') return;
      
      // Load marketing attribution from URL parameters or localStorage
      this.marketingAttribution = this.getMarketingAttribution();
      this.abTestVariants = JSON.parse(localStorage.getItem('ab_test_variants') || '[]');
      this.userId = localStorage.getItem('analytics_user_id') || undefined;
    } catch (error) {
      console.warn('Failed to load stored analytics data:', error);
    }
  }

  private getMarketingAttribution(): MarketingAttribution | undefined {
    if (typeof window === 'undefined') return undefined;

    const urlParams = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem('marketing_attribution');

    // Check URL parameters first
    const attribution = {
      source: urlParams.get('utm_source') || urlParams.get('source') || '',
      medium: urlParams.get('utm_medium') || urlParams.get('medium') || '',
      campaign: urlParams.get('utm_campaign') || urlParams.get('campaign') || '',
      term: urlParams.get('utm_term') || urlParams.get('term') || undefined,
      content: urlParams.get('utm_content') || urlParams.get('content') || undefined,
      gclid: urlParams.get('gclid') || undefined,
      fbclid: urlParams.get('fbclid') || undefined,
    };

    // If we have URL parameters, use them and store
    if (attribution.source || attribution.medium || attribution.campaign) {
      localStorage.setItem('marketing_attribution', JSON.stringify(attribution));
      return attribution;
    }

    // Otherwise use stored attribution
    try {
      return stored ? JSON.parse(stored) : undefined;
    } catch {
      return undefined;
    }
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Only initialize on client side
      if (typeof window === 'undefined') {
        this.isInitialized = true;
        return;
      }
      
      // Load any existing session data
      const storedSessionId = localStorage.getItem('analytics_session_id');
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      } else {
        localStorage.setItem('analytics_session_id', this.sessionId);
      }

      this.isInitialized = true;

      // Track session start
      this.trackEvent('session_start', {
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // Track page view for initial page
      this.trackPageView(window.location.pathname);

    } catch (error) {
      console.error('Analytics initialization failed:', error);
    }
  }

  // Google Analytics Integration
  initializeGoogleAnalytics(config: GoogleAnalyticsConfig) {
    this.googleAnalyticsConfig = config;

    if (typeof window === 'undefined') return;

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', config.measurementId, {
      debug_mode: config.debug,
      custom_map: {
        dimension1: 'user_type',
        dimension2: 'subscription_status',
        dimension3: 'marketing_source',
        dimension4: 'ab_test_variant',
      }
    });

    // Track marketing attribution if available
    if (this.marketingAttribution) {
      window.gtag('set', 'campaign', {
        source: this.marketingAttribution.source,
        medium: this.marketingAttribution.medium,
        campaign: this.marketingAttribution.campaign,
        term: this.marketingAttribution.term,
        content: this.marketingAttribution.content,
      });
    }
  }

  private trackGoogleAnalytics(event: string, parameters: Record<string, any> = {}) {
    if (typeof window !== 'undefined' && window.gtag && this.googleAnalyticsConfig) {
      window.gtag('event', event, {
        ...parameters,
        custom_parameter_1: this.userId,
        custom_parameter_2: this.sessionId,
        custom_parameter_3: this.marketingAttribution?.source,
        custom_parameter_4: this.getCurrentABTestVariant(),
      });
    }
  }

  // A/B Testing Methods
  setABTestVariant(testId: string, variantId: string, experimentName: string) {
    const variant: ABTestVariant = { testId, variantId, experimentName };
    this.abTestVariants = this.abTestVariants.filter(v => v.testId !== testId);
    this.abTestVariants.push(variant);
    localStorage.setItem('ab_test_variants', JSON.stringify(this.abTestVariants));

    // Track in Google Analytics
    this.trackGoogleAnalytics('experiment_impression', {
      experiment_id: testId,
      experiment_name: experimentName,
      variant_id: variantId,
    });
  }

  getCurrentABTestVariant(testId?: string): string | undefined {
    if (testId) {
      return this.abTestVariants.find(v => v.testId === testId)?.variantId;
    }
    return this.abTestVariants.length > 0 ? this.abTestVariants[0].variantId : undefined;
  }

  // Enhanced tracking methods with Google Analytics
  trackConversion(event: ConversionEvent) {
    // Track in custom analytics
    this.trackEvent('conversion', event);

    // Track in Google Analytics
    this.trackGoogleAnalytics(event.event, {
      value: event.value,
      currency: event.currency || 'USD',
      items: event.items,
    });
  }

  trackMarketingAttribution() {
    if (this.marketingAttribution) {
      this.trackEvent('marketing_attribution', this.marketingAttribution);
      this.trackGoogleAnalytics('marketing_attribution', this.marketingAttribution);
    }
  }

  trackEvent(event: string, properties: Record<string, any> = {}) {
    if (!this.isInitialized) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      properties,
      page: window.location.pathname,
      userAgent: navigator.userAgent,
    };

    this.events.push(analyticsEvent);

    // Send to analytics service (in production)
    this.sendToAnalyticsService(analyticsEvent);

    // Track in Google Analytics
    this.trackGoogleAnalytics(event, properties);

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', analyticsEvent);
    }
  }

  trackPageView(page: string, properties: Record<string, any> = {}) {
    this.trackEvent('page_view', {
      page,
      title: document.title,
      ...properties,
    });
  }

  trackUserAction(action: string, element: string, properties: Record<string, any> = {}) {
    this.trackEvent('user_action', {
      action,
      element,
      ...properties,
    });
  }

  trackSearch(query: string, filters: Record<string, any>, resultsCount: number) {
    this.trackEvent('search', {
      query,
      filters,
      resultsCount,
    });
  }

  trackApartmentView(apartmentId: string, apartmentData: Record<string, any>) {
    this.trackEvent('apartment_view', {
      apartmentId,
      ...apartmentData,
    });
  }

  trackApplication(apartmentId: string, applicationData: Record<string, any>) {
    this.trackEvent('application_submit', {
      apartmentId,
      ...applicationData,
    });
  }

  trackError(error: Error, context: Record<string, any> = {}) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }

  trackPerformance(metric: string, value: number, context: Record<string, any> = {}) {
    this.trackEvent('performance', {
      metric,
      value,
      ...context,
    });
  }

  private async sendToAnalyticsService(event: AnalyticsEvent) {
    try {
      // In production, send to your analytics service
      // For now, we'll just store in localStorage for demo purposes
      const existingEvents = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      existingEvents.push(event);

      // Keep only last 1000 events to prevent localStorage bloat
      if (existingEvents.length > 1000) {
        existingEvents.splice(0, existingEvents.length - 1000);
      }

      localStorage.setItem('analytics_events', JSON.stringify(existingEvents));

    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  getStoredEvents(): AnalyticsEvent[] {
    try {
      return JSON.parse(localStorage.getItem('analytics_events') || '[]');
    } catch {
      return [];
    }
  }

  clearStoredEvents() {
    localStorage.removeItem('analytics_events');
  }

  // Analytics reporting methods
  getPageViews(): Record<string, number> {
    const events = this.getStoredEvents();
    const pageViews: Record<string, number> = {};

    events
      .filter(event => event.event === 'page_view')
      .forEach(event => {
        const page = event.page || 'unknown';
        pageViews[page] = (pageViews[page] || 0) + 1;
      });

    return pageViews;
  }

  getUserActions(): Record<string, number> {
    const events = this.getStoredEvents();
    const actions: Record<string, number> = {};

    events
      .filter(event => event.event === 'user_action')
      .forEach(event => {
        const action = event.properties?.action || 'unknown';
        actions[action] = (actions[action] || 0) + 1;
      });

    return actions;
  }

  getSearchQueries(): Array<{ query: string; count: number; avgResults: number }> {
    const events = this.getStoredEvents();
    const searches: Record<string, { count: number; totalResults: number }> = {};

    events
      .filter(event => event.event === 'search')
      .forEach(event => {
        const query = event.properties?.query || '';
        const resultsCount = event.properties?.resultsCount || 0;

        if (!searches[query]) {
          searches[query] = { count: 0, totalResults: 0 };
        }

        searches[query].count += 1;
        searches[query].totalResults += resultsCount;
      });

    return Object.entries(searches).map(([query, data]) => ({
      query,
      count: data.count,
      avgResults: data.totalResults / data.count,
    }));
  }

  getConversionFunnel(): {
    views: number;
    applications: number;
    conversionRate: number;
  } {
    const events = this.getStoredEvents();

    const views = events.filter(event => event.event === 'apartment_view').length;
    const applications = events.filter(event => event.event === 'application_submit').length;

    return {
      views,
      applications,
      conversionRate: views > 0 ? (applications / views) * 100 : 0,
    };
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  analytics.initialize();
}