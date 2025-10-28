/**
 * Advanced in-memory rate limiter with sliding window and endpoint-specific limits
 * Fallback to Redis if available for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  requests: number[]; // Timestamps for sliding window
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

// Endpoint-specific rate limits
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/search': { limit: 20, windowMs: 60000 }, // 20 req/min for search
  '/api/apartments': { limit: 50, windowMs: 60000 }, // 50 req/min for apartments
  '/api/messages': { limit: 30, windowMs: 60000 }, // 30 req/min for messages
  '/api/auth': { limit: 5, windowMs: 60000 }, // 5 req/min for auth
  '/login': { limit: 5, windowMs: 60000 }, // 5 req/min for login
  '/signup': { limit: 3, windowMs: 60000 }, // 3 req/min for signup
  default: { limit: 100, windowMs: 60000 }, // 100 req/min default
};

class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | number | null = null;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      Array.from(this.requests.entries()).forEach(([key, entry]) => {
        if (entry.resetTime < now) {
          this.requests.delete(key);
        }
      });
    }, 60000);
  }

  /**
   * Get rate limit config for a specific endpoint
   */
  private getConfigForEndpoint(endpoint: string): RateLimitConfig {
    // Check for exact match
    if (RATE_LIMITS[endpoint]) {
      return RATE_LIMITS[endpoint];
    }

    // Check for partial matches
    for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
      if (endpoint.startsWith(pattern)) {
        return config;
      }
    }

    return RATE_LIMITS.default;
  }

  /**
   * Check if a request should be rate limited using sliding window algorithm
   * @param identifier - Unique identifier (e.g., IP address)
   * @param endpoint - API endpoint path
   * @param customLimit - Optional custom limit override
   * @param customWindowMs - Optional custom window override
   * @returns Object with success boolean and remaining count
   */
  check(
    identifier: string,
    endpoint: string = '/api',
    customLimit?: number,
    customWindowMs?: number
  ): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const config = this.getConfigForEndpoint(endpoint);
    const limit = customLimit || config.limit;
    const windowMs = customWindowMs || config.windowMs;
    
    const key = `${identifier}:${endpoint}`;
    const entry = this.requests.get(key);

    if (!entry || entry.resetTime < now) {
      // First request or window expired
      const resetTime = now + windowMs;
      this.requests.set(key, { 
        count: 1, 
        resetTime,
        requests: [now]
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetTime,
      };
    }

    // Sliding window: remove requests outside the window
    const validRequests = entry.requests.filter(timestamp => timestamp > now - windowMs);
    
    if (validRequests.length >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        limit,
        remaining: 0,
        reset: entry.resetTime,
      };
    }

    // Add current request
    validRequests.push(now);
    entry.count = validRequests.length;
    entry.requests = validRequests;
    entry.resetTime = now + windowMs;
    this.requests.set(key, entry);

    return {
      success: true,
      limit,
      remaining: limit - validRequests.length,
      reset: entry.resetTime,
    };
  }

  /**
   * Check rate limit for authenticated users (higher limits)
   */
  checkAuthenticated(
    identifier: string,
    endpoint: string = '/api'
  ): { success: boolean; limit: number; remaining: number; reset: number } {
    const config = this.getConfigForEndpoint(endpoint);
    // Authenticated users get 3x the limit
    return this.check(identifier, endpoint, config.limit * 3, config.windowMs);
  }

  /**
   * Get the client identifier from the request
   */
  getIdentifier(ip: string | null, fallback: string = 'anonymous'): string {
    return ip || fallback;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();
