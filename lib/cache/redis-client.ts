/**
 * Redis Cache Client
 * Provides caching infrastructure for performance optimization
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client (Upstash)
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Cache key prefixes
export const CACHE_KEYS = {
    SEARCH_RESULTS: 'search:',
    APARTMENT_DETAILS: 'apartment:',
    USER_PROFILE: 'profile:',
    APARTMENT_LIST: 'apartments:list:',
} as const;

// Cache TTLs (in seconds)
export const CACHE_TTL = {
    SEARCH_RESULTS: 5 * 60, // 5 minutes
    APARTMENT_DETAILS: 60 * 60, // 1 hour
    USER_PROFILE: 30 * 60, // 30 minutes
    APARTMENT_LIST: 10 * 60, // 10 minutes
} as const;

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
    try {
        const value = await redis.get<T>(key);
        return value;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

/**
 * Set cached value with TTL
 */
export async function setCache<T>(
    key: string,
    value: T,
    ttl: number
): Promise<void> {
    try {
        await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
        console.error('Cache set error:', error);
    }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<void> {
    try {
        await redis.del(key);
    } catch (error) {
        console.error('Cache delete error:', error);
    }
}

/**
 * Delete multiple keys matching pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Cache pattern delete error:', error);
    }
}

/**
 * Check if Redis is available
 */
export async function isCacheAvailable(): Promise<boolean> {
    try {
        await redis.ping();
        return true;
    } catch {
        return false;
    }
}

export { redis };
