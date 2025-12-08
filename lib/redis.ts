import { logger } from '@/lib/logger';

let redis: any = null;

const getRedisClient = async () => {
    if (redis) return redis;

    // Only import ioredis at runtime, not during build
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
        try {
            const Redis = (await import('ioredis')).default;
            if (process.env.REDIS_URL) {
                redis = new Redis(process.env.REDIS_URL);
            } else {
                redis = new Redis();
            }
        } catch (error) {
            logger.warn({ error }, 'Failed to initialize Redis');
            return null;
        }
    }
    return redis;
};

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const client = await getRedisClient();
        if (!client) return null;

        const data = await client.get(key);
        if (data) return JSON.parse(data);
        return null;
    } catch (error) {
        logger.warn({ error, key }, 'Redis get error');
        return null;
    }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    try {
        const client = await getRedisClient();
        if (!client) return;

        await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (error) {
        logger.warn({ error, key }, 'Redis set error');
    }
}

