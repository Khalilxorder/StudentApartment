/**
 * Redis caching layer - disabled for serverless deployment
 * ioredis requires native modules incompatible with Vercel
 * All cache operations gracefully return null/void
 */

export async function cacheGet<T>(_key: string): Promise<T | null> {
    // Redis disabled in serverless environment
    return null;
}

export async function cacheSet(_key: string, _value: unknown, _ttlSeconds: number = 300): Promise<void> {
    // Redis disabled in serverless environment
    return;
}
