/**
 * Clear All Rate Limits Script
 * 
 * This script clears all rate limit data from Redis to allow immediate access.
 * Use this after adjusting rate limit configurations.
 */

import { Redis } from '@upstash/redis';

async function clearRateLimits() {
    try {
        // Initialize Redis client
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        });

        console.log('🔍 Scanning for rate limit keys...');

        // Get all rate limit keys
        const keys = await redis.keys('ratelimit:*');

        if (keys.length === 0) {
            console.log('✅ No rate limit keys found. Nothing to clear.');
            return;
        }

        console.log(`📊 Found ${keys.length} rate limit keys`);

        // Delete all keys in batches
        const batchSize = 100;
        let deleted = 0;

        for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await redis.del(...batch);
            deleted += batch.length;
            console.log(`🗑️  Deleted ${deleted} / ${keys.length} keys...`);
        }

        console.log('✅ Successfully cleared all rate limits!');
        console.log('🎉 You can now browse the application without restrictions.');

    } catch (error) {
        console.error('❌ Error clearing rate limits:', error);

        // Check if Redis is not configured
        if (error instanceof Error && error.message.includes('UPSTASH_REDIS')) {
            console.log('ℹ️  Redis not configured. Rate limiting is using in-memory fallback.');
            console.log('   Restart your dev server (npm run dev) to clear in-memory limits.');
        }
    }
}

clearRateLimits();
