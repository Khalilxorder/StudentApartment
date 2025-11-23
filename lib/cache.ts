/**
 * Advanced caching layer with Redis support and in-memory fallback
 * Provides intelligent caching for search results, apartment data, and user profiles
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for cache invalidation
}

class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redis: any = null; // Redis client if available
  private cleanupInterval: any = null;

  constructor() {
    // Initialize Redis if available
    this.initializeRedis();

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  private async initializeRedis() {
    try {
      if (process.env.REDIS_URL) {
        // Dynamically import Redis only if needed
        // const { Redis } = await import('ioredis');
        // this.redis = new Redis(process.env.REDIS_URL);
        // this.redis.on('error', (err: any) => {
        //   // Suppress connection errors to allow fallback to memory cache
        //   // console.warn('Redis connection error, using fallback:', err.message);
        //   this.redis = null;
        // });
        // console.log('✅ Redis cache connected');
        console.warn('⚠️ Redis disabled for build/testing');
      }
    } catch (error) {
      console.warn('⚠️ Redis not available, using in-memory cache fallback');
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        return entry.value;
      }

      // Expired or not found
      if (entry) {
        this.memoryCache.delete(key);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || 300; // Default 5 minutes
    const expiresAt = Date.now() + ttl * 1000;
    const tags = options.tags || [];

    try {
      // Save to Redis if available
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value));

        // Store tags for invalidation
        if (tags.length > 0) {
          for (const tag of tags) {
            await this.redis.sadd(`tag:${tag}`, key);
            await this.redis.expire(`tag:${tag}`, ttl);
          }
        }
      }

      // Always save to memory cache as backup
      this.memoryCache.set(key, {
        value,
        expiresAt,
        tags,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.smembers(`tag:${tag}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
          await this.redis.del(`tag:${tag}`);
        }
      }

      // Invalidate memory cache
      const keysToDelete: string[] = [];
      this.memoryCache.forEach((entry, key) => {
        if (entry.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.memoryCache.delete(key));
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }
      this.memoryCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await fetchFn();

    // Cache the result
    await this.set(key, value, options);

    return value;
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.memoryCache.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.memoryCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    redisConnected: boolean;
  } {
    return {
      memorySize: this.memoryCache.size,
      redisConnected: this.redis !== null,
    };
  }
}

// Singleton instance
export const cache = new CacheService();

// Helper functions for common cache patterns
export const cacheHelpers = {
  /**
   * Cache key generators
   */
  keys: {
    search: (query: string, filters: any) =>
      `search:${query}:${JSON.stringify(filters)}`,
    apartment: (id: string) =>
      `apartment:${id}`,
    apartments: (filters: any) =>
      `apartments:${JSON.stringify(filters)}`,
    user: (id: string) =>
      `user:${id}`,
    userProfile: (id: string) =>
      `user:${id}:profile`,
    apartmentReviews: (id: string) =>
      `apartment:${id}:reviews`,
  },

  /**
   * Cache TTL configurations (in seconds)
   */
  ttl: {
    search: 300, // 5 minutes
    apartment: 900, // 15 minutes
    apartments: 600, // 10 minutes
    user: 600, // 10 minutes
    reviews: 1800, // 30 minutes
    static: 86400, // 24 hours
  },

  /**
   * Cache tags for invalidation
   */
  tags: {
    apartment: (id: string) => `apartment:${id}`,
    apartments: () => 'apartments',
    user: (id: string) => `user:${id}`,
    search: () => 'search',
  },
};
