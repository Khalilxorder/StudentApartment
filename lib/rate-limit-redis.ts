/**
 * Redis-backed Rate Limiting
 * 
 * Production-ready rate limiting with Upstash Redis
 * Replaces in-memory implementation with distributed solution
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';


// Initialize Redis client safely
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || 'https://mock.upstash.io',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || 'mock',
});

/**
 * Rate limit configurations for different tiers
 */
export const rateLimits = {
    // API endpoints
    api: {
        free: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(500, '1 m'), // Increased from 100 to 500 for development
            analytics: true,
            prefix: 'ratelimit:api:free',
        }),
        pro: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(1000, '1 m'),
            analytics: true,
            prefix: 'ratelimit:api:pro',
        }),
        enterprise: new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(10000, '1 m'),
            analytics: true,
            prefix: 'ratelimit:api:enterprise',
        }),
    },

    // Authentication endpoints (stricter limits)
    auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
        analytics: true,
        prefix: 'ratelimit:auth',
    }),

    // Search endpoints
    search: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
        prefix: 'ratelimit:search',
    }),

    // File upload endpoints
    upload: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: true,
        prefix: 'ratelimit:upload',
    }),

    // Email sending
    email: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '1 h'),
        analytics: true,
        prefix: 'ratelimit:email',
    }),
};

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
    identifier: string,
    tier: 'free' | 'pro' | 'enterprise' = 'free',
    type: 'api' | 'auth' | 'search' | 'upload' | 'email' = 'api'
): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}> {
    try {
        let limiter: Ratelimit;

        if (type === 'api') {
            limiter = rateLimits.api[tier];
        } else {
            limiter = rateLimits[type];
        }

        const { success, limit, reset, remaining } = await limiter.limit(identifier);

        return {
            success,
            limit,
            remaining,
            reset,
        };
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // Fail open - allow request if Redis is down
        return {
            success: true,
            limit: 0,
            remaining: 0,
            reset: 0,
        };
    }
}

/**
 * Get rate limit analytics
 */
export async function getRateLimitAnalytics(
    prefix: string,
    startTime?: number,
    endTime?: number
): Promise<any> {
    try {
        // Upstash Ratelimit analytics
        const keys = await redis.keys(`${prefix}:*`);

        const analytics = await Promise.all(
            keys.map(async (key) => {
                const data = await redis.get(key);
                return { key, data };
            })
        );

        return analytics;
    } catch (error) {
        console.error('Failed to get rate limit analytics:', error);
        return [];
    }
}

/**
 * Reset rate limit for a specific identifier (admin use)
 */
export async function resetRateLimit(
    identifier: string,
    type: 'api' | 'auth' | 'search' | 'upload' | 'email' = 'api'
): Promise<void> {
    try {
        const prefix = type === 'api'
            ? 'ratelimit:api:free'
            : `ratelimit:${type}`;

        const keys = await redis.keys(`${prefix}:${identifier}:*`);

        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch (error) {
        console.error('Failed to reset rate limit:', error);
    }
}

/**
 * Middleware helper for Next.js API routes
 */
export async function withRateLimit(
    request: Request,
    options: {
        type?: 'api' | 'auth' | 'search' | 'upload' | 'email';
        tier?: 'free' | 'pro' | 'enterprise';
        identifier?: string;
    } = {}
): Promise<Response | null> {
    const {
        type = 'api',
        tier = 'free',
        identifier = getIdentifier(request),
    } = options;

    const result = await checkRateLimit(identifier, tier, type);

    if (!result.success) {
        return new Response(
            JSON.stringify({
                error: 'Rate limit exceeded',
                limit: result.limit,
                reset: result.reset,
                retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': result.limit.toString(),
                    'X-RateLimit-Remaining': result.remaining.toString(),
                    'X-RateLimit-Reset': result.reset.toString(),
                    'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
                },
            }
        );
    }

    return null;
}

/**
 * Get identifier from request (IP or user ID)
 */
function getIdentifier(request: Request): string {
    // Try to get user ID from session/token first
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        // Extract user ID from JWT or session
        // This is a simplified version - adjust based on your auth implementation
        return `user:${authHeader.slice(0, 20)}`;
    }

    // Fall back to IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

    return `ip:${ip}`;
}


