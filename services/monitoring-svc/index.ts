// Monitoring & Observability Service
// Integrates Sentry, PostHog, and custom metrics collection

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

export interface MetricPoint {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

export interface PerformanceMetrics {
  apiLatency: MetricPoint[];
  databaseLatency: MetricPoint[];
  searchLatency: MetricPoint[];
  errorRate: MetricPoint[];
}

export interface ErrorReport {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'fatal';
  message: string;
  context?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
}

export class MonitoringService {
  private metrics: Map<string, MetricPoint[]> = new Map();
  private maxMetricsAge = 24 * 60 * 60 * 1000; // 24 hours in ms

  constructor() {
    this.initializeSentry();
    this.initializePostHog();
  }

  private initializeSentry(): void {
    if (typeof window === 'undefined') {
      // Server-side Sentry
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        denyUrls: [
          // Browser extensions
          /extensions\//i,
          /^chrome:\/\//i,
          // Ignore NextJS internal routes
          /^\/_next\//i,
        ],
      });
    }
  }

  private initializePostHog(): void {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || '', {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        loaded: (ph: any) => {
          // PostHog loaded
        },
      });
    }
  }

  /**
   * Record API performance metrics
   */
  recordAPIMetric(
    endpoint: string,
    latency: number,
    status: number,
    userId?: string
  ): void {
    const key = `api:${endpoint}:${status}`;
    const point: MetricPoint = {
      timestamp: new Date(),
      value: latency,
      tags: { endpoint, status: String(status), ...(userId && { userId }) },
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(point);

    // Cleanup old metrics
    this.cleanupOldMetrics();
  }

  /**
   * Record database query performance
   */
  recordDatabaseMetric(query: string, latency: number, rowCount?: number): void {
    const key = `db:${query}`;
    const point: MetricPoint = {
      timestamp: new Date(),
      value: latency,
      tags: { query, rowCount: String(rowCount || 0) },
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(point);

    // Alert on slow queries (>1s)
    if (latency > 1000) {
      console.warn(`Slow database query detected: ${query} (${latency}ms)`);
      this.captureWarning(`Slow query: ${query}`, { latency, rowCount });
    }

    this.cleanupOldMetrics();
  }

  /**
   * Record search engine metrics
   */
  recordSearchMetric(query: string, latency: number, resultCount: number): void {
    const key = `search:${query.substring(0, 50)}`;
    const point: MetricPoint = {
      timestamp: new Date(),
      value: latency,
      tags: { query, resultCount: String(resultCount) },
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(point);

    // Track analytics event
    if (typeof window !== 'undefined') {
      posthog.capture('search_performed', {
        query,
        latency,
        resultCount,
      });
    }

    this.cleanupOldMetrics();
  }

  /**
   * Capture and report errors
   */
  captureError(error: Error, context?: Record<string, any>): void {
    const report: ErrorReport = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stackTrace: error.stack,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    console.error('Error captured:', report);

    // Send to Sentry
    Sentry.captureException(error, { extra: context });

    // Send to PostHog (analytics)
    if (typeof window !== 'undefined') {
      posthog.capture('error_occurred', {
        message: error.message,
        context,
      });
    }
  }

  /**
   * Capture warnings (non-critical issues)
   */
  captureWarning(message: string, context?: Record<string, any>): void {
    const report: ErrorReport = {
      id: `warn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level: 'warning',
      message,
      context,
    };

    console.warn('Warning captured:', report);

    // Send to Sentry
    Sentry.captureMessage(message, 'warning');

    // Send to PostHog
    if (typeof window !== 'undefined') {
      posthog.capture('warning_occurred', { message, context });
    }
  }

  /**
   * Track user events (analytics)
   */
  trackEvent(
    eventName: string,
    properties?: Record<string, any>,
    userId?: string
  ): void {
    if (typeof window !== 'undefined') {
      posthog.capture(eventName, properties);
    }

    // Also send to Sentry as breadcrumb
    Sentry.addBreadcrumb({
      category: 'user-event',
      message: eventName,
      data: properties,
      level: 'info',
    });
  }

  /**
   * Get performance metrics for a time range
   */
  getMetrics(
    key: string,
    startTime?: Date,
    endTime?: Date
  ): PerformanceMetrics | MetricPoint[] {
    const start = startTime || new Date(Date.now() - 60 * 60 * 1000); // Default: last hour
    const end = endTime || new Date();

    const metrics = this.metrics.get(key) || [];
    return metrics.filter(m => m.timestamp >= start && m.timestamp <= end);
  }

  /**
   * Get performance summary statistics
   */
  getMetricsSummary(key: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    count: number;
  } {
    const metrics = this.metrics.get(key) || [];
    if (metrics.length === 0) {
      return { avg: 0, min: 0, max: 0, p95: 0, p99: 0, count: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      avg: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[Math.ceil(values.length * 0.95) - 1] || 0,
      p99: values[Math.ceil(values.length * 0.99) - 1] || 0,
      count: values.length,
    };
  }

  /**
   * Set user context for error tracking
   */
  setUserContext(userId: string, email?: string, username?: string): void {
    Sentry.setUser({
      id: userId,
      email,
      username,
    });

    if (typeof window !== 'undefined') {
      posthog.identify(userId, { email, username });
    }
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    Sentry.setUser(null);
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  }

  /**
   * Health check for monitoring services
   */
  async healthCheck(): Promise<{
    sentry: boolean;
    posthog: boolean;
  }> {
    return {
      sentry: !!process.env.SENTRY_DSN,
      posthog: !!process.env.NEXT_PUBLIC_POSTHOG_KEY,
    };
  }

  /**
   * Cleanup metrics older than maxMetricsAge
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    for (const [key, points] of this.metrics.entries()) {
      const filtered = points.filter(
        p => now - p.timestamp.getTime() < this.maxMetricsAge
      );
      if (filtered.length === 0) {
        this.metrics.delete(key);
      } else {
        this.metrics.set(key, filtered);
      }
    }
  }
}

export const monitoringService = new MonitoringService();
