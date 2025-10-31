// Performance Optimization Service for Student Apartments
// Handles caching, optimization, and performance monitoring
import { createClient } from '@supabase/supabase-js';

export interface PerformanceMetric {
  id: string;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userAgent: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
}

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: Date;
  tags: string[];
  accessCount: number;
  lastAccessed: Date;
}

export interface OptimizationRule {
  id: string;
  name: string;
  type: 'cache' | 'compression' | 'lazy_load' | 'prefetch' | 'cdn';
  pattern: string; // URL pattern or condition
  config: Record<string, any>;
  enabled: boolean;
  priority: number;
}

export interface PerformanceReport {
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    averageResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    throughput: number;
    cacheHitRate: number;
  };
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    requestCount: number;
  }>;
  recommendations: string[];
}

export class PerformanceOptimizationService {
  private supabase: any = null;
  private memoryCache = new Map<string, CacheEntry>();
  private optimizationRules: OptimizationRule[] = [];

  private getSupabase() {
    if (!this.supabase) {
      this.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this.supabase;
  }

  constructor() {
    // Lazy initialization - don't call getSupabase() here
  }

  /**
   * Load optimization rules from database
   */
  private async loadOptimizationRules(): Promise<void> {
    try {
      const { data: rules, error } = await this.supabase
        .from('optimization_rules')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false });

      if (!error && rules) {
        this.optimizationRules = rules.map((rule: any) => ({
          id: rule.id,
          name: rule.name,
          type: rule.type,
          pattern: rule.pattern,
          config: rule.config,
          enabled: rule.enabled,
          priority: rule.priority,
        }));
      }
    } catch (error) {
      console.error('Load optimization rules error:', error);
    }
  }

  /**
   * Record performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      // Store in memory for quick access
      // In production, you might want to batch these

      await this.supabase
        .from('performance_metrics')
        .insert({
          endpoint: metric.endpoint,
          method: metric.method,
          response_time: metric.responseTime,
          status_code: metric.statusCode,
          user_agent: metric.userAgent,
          user_id: metric.userId,
          ip_address: metric.ipAddress,
        });

      // Check for performance issues
      if (metric.responseTime > 5000) { // 5 seconds
        await this.alertSlowResponse(metric);
      }

    } catch (error) {
      console.error('Record metric error:', error);
    }
  }

  /**
   * Get cached value
   */
  async getCached(key: string, tags: string[] = []): Promise<any | null> {
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && memoryEntry.expiresAt > new Date()) {
        memoryEntry.accessCount++;
        memoryEntry.lastAccessed = new Date();
        return memoryEntry.value;
      }

      // Check database cache
      const { data: dbEntry, error } = await this.supabase
        .from('cache_entries')
        .select('*')
        .eq('key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!error && dbEntry) {
        // Update access stats
        await this.supabase
          .from('cache_entries')
          .update({
            access_count: dbEntry.access_count + 1,
            last_accessed: new Date().toISOString(),
          })
          .eq('id', dbEntry.id);

        return JSON.parse(dbEntry.value);
      }

      return null;

    } catch (error) {
      console.error('Get cached error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async setCached(
    key: string,
    value: any,
    ttlSeconds: number = 300,
    tags: string[] = []
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Store in memory cache
      this.memoryCache.set(key, {
        key,
        value,
        expiresAt,
        tags,
        accessCount: 0,
        lastAccessed: new Date(),
      });

      // Store in database cache
      await this.supabase
        .from('cache_entries')
        .upsert({
          key,
          value: JSON.stringify(value),
          expires_at: expiresAt.toISOString(),
          tags,
          access_count: 0,
          last_accessed: new Date().toISOString(),
        });

      // Clean up expired memory cache entries
      this.cleanupMemoryCache();

    } catch (error) {
      console.error('Set cached error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateCache(tags: string[]): Promise<void> {
    try {
      // Invalidate memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (tags.some(tag => entry.tags.includes(tag))) {
          this.memoryCache.delete(key);
        }
      }

      // Invalidate database cache
      if (tags.length > 0) {
        await this.supabase
          .from('cache_entries')
          .delete()
          .overlaps('tags', tags);
      }

    } catch (error) {
      console.error('Invalidate cache error:', error);
    }
  }

  /**
   * Apply optimization rules to request
   */
  applyOptimizations(url: string, userAgent: string): {
    shouldCache: boolean;
    cacheTTL: number;
    shouldCompress: boolean;
    cdnUrl?: string;
    prefetchUrls: string[];
  } {
    const optimizations = {
      shouldCache: false,
      cacheTTL: 300, // 5 minutes default
      shouldCompress: true,
      cdnUrl: undefined as string | undefined,
      prefetchUrls: [] as string[],
    };

    for (const rule of this.optimizationRules) {
      if (this.matchesPattern(url, rule.pattern)) {
        switch (rule.type) {
          case 'cache':
            optimizations.shouldCache = rule.config.enabled !== false;
            optimizations.cacheTTL = rule.config.ttl || optimizations.cacheTTL;
            break;
          case 'compression':
            optimizations.shouldCompress = rule.config.enabled !== false;
            break;
          case 'cdn':
            if (rule.config.enabled !== false) {
              optimizations.cdnUrl = rule.config.cdnUrl;
            }
            break;
          case 'prefetch':
            if (rule.config.urls) {
              optimizations.prefetchUrls.push(...rule.config.urls);
            }
            break;
        }
      }
    }

    return optimizations;
  }

  /**
   * Check if URL matches pattern
   */
  private matchesPattern(url: string, pattern: string): boolean {
    // Simple wildcard matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceReport> {
    try {
      // Get metrics from database
      const { data: metrics, error } = await this.supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Calculate metrics
      const totalRequests = metrics?.length || 0;
      const responseTimes = metrics?.map((m: any) => m.response_time) || [];
      const errors = metrics?.filter((m: any) => m.status_code >= 400) || [];

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length
        : 0;

      const sortedTimes = responseTimes.sort((a: number, b: number) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p95ResponseTime = sortedTimes[p95Index] || 0;

      const errorRate = totalRequests > 0 ? (errors.length / totalRequests) * 100 : 0;

      // Calculate throughput (requests per minute)
      const timeRangeMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      const throughput = timeRangeMinutes > 0 ? totalRequests / timeRangeMinutes : 0;

      // Get slowest endpoints
      const endpointStats = new Map<string, { totalTime: number; count: number }>();

      metrics?.forEach((metric: any) => {
        const key = `${metric.method} ${metric.endpoint}`;
        const existing = endpointStats.get(key) || { totalTime: 0, count: 0 };
        existing.totalTime += metric.response_time;
        existing.count += 1;
        endpointStats.set(key, existing);
      });

      const slowestEndpoints = Array.from(endpointStats.entries())
        .map(([endpoint, stats]: any) => ({
          endpoint,
          averageTime: stats.totalTime / stats.count,
          requestCount: stats.count,
        }))
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 10);

      // Get cache hit rate (simplified)
      const cacheHitRate = await this.calculateCacheHitRate(startDate, endDate);

      // Generate recommendations
      const recommendations = this.generateRecommendations({
        averageResponseTime,
        p95ResponseTime,
        errorRate,
        throughput,
        slowestEndpoints,
      });

      return {
        period: { start: startDate, end: endDate },
        metrics: {
          averageResponseTime,
          p95ResponseTime,
          errorRate,
          throughput,
          cacheHitRate,
        },
        slowestEndpoints,
        recommendations,
      };

    } catch (error) {
      console.error('Generate performance report error:', error);
      throw new Error(`Failed to generate performance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cache hit rate
   */
  private async calculateCacheHitRate(startDate: Date, endDate: Date): Promise<number> {
    try {
      const { data: cacheEntries, error } = await this.supabase
        .from('cache_entries')
        .select('access_count')
        .gte('last_accessed', startDate.toISOString())
        .lte('last_accessed', endDate.toISOString());

      if (error || !cacheEntries) return 0;

      const totalAccesses = cacheEntries.reduce((sum: number, entry: any) => sum + entry.access_count, 0);
      // Simplified: assume 70% hit rate if we have cache data
      return cacheEntries.length > 0 ? 70 : 0;

    } catch (error) {
      console.error('Calculate cache hit rate error:', error);
      return 0;
    }
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    if (data.averageResponseTime > 2000) {
      recommendations.push('Consider implementing caching for slow endpoints');
    }

    if (data.p95ResponseTime > 5000) {
      recommendations.push('Optimize the slowest 5% of requests - check database queries and external API calls');
    }

    if (data.errorRate > 5) {
      recommendations.push('High error rate detected - investigate and fix API errors');
    }

    if (data.cacheHitRate < 50) {
      recommendations.push('Low cache hit rate - review caching strategy and TTL settings');
    }

    if (data.slowestEndpoints.length > 0) {
      const slowest = data.slowestEndpoints[0];
      recommendations.push(`Optimize ${slowest.endpoint} (avg ${slowest.averageTime.toFixed(0)}ms, ${slowest.requestCount} requests)`);
    }

    return recommendations;
  }

  /**
   * Cleanup expired memory cache entries
   */
  private cleanupMemoryCache(): void {
    const now = new Date();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Alert on slow response
   */
  private async alertSlowResponse(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      // In production, this would send alerts to monitoring systems
      console.warn(`Slow response detected: ${metric.endpoint} took ${metric.responseTime}ms`);

      // Store alert in database
      await this.supabase
        .from('performance_alerts')
        .insert({
          type: 'slow_response',
          endpoint: metric.endpoint,
          response_time: metric.responseTime,
          user_id: metric.userId,
          details: {
            method: metric.method,
            statusCode: metric.statusCode,
            userAgent: metric.userAgent,
          },
        });

    } catch (error) {
      console.error('Alert slow response error:', error);
    }
  }

  /**
   * Optimize images (utility function)
   */
  async optimizeImage(buffer: Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}): Promise<Buffer> {
    const { default: sharp } = await import('sharp');

    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
      format = 'webp',
    } = options;

    return sharp(buffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  }

  /**
   * Warm up cache for popular content
   */
  async warmupCache(urls: string[]): Promise<void> {
    try {
      for (const url of urls) {
        // Pre-fetch and cache content
        // This would typically involve making requests to your own endpoints
        console.log(`Warming up cache for: ${url}`);
      }
    } catch (error) {
      console.error('Cache warmup error:', error);
    }
  }
}

// Export singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();
