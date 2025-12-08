import { createClient } from '@supabase/supabase-js';

/**
 * Database Connection Pooling Configuration
 * 
 * Supabase automatically handles connection pooling, but we can optimize our client usage
 */

// Singleton pattern for server-side Supabase client
let supabaseServerInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
    if (!supabaseServerInstance) {
        supabaseServerInstance = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },

                global: {
                    headers: {
                        'X-Client-Info': 'student-apartments-server',
                    },
                },
            }
        );
    }
    return supabaseServerInstance;
}

/**
 * Query optimization helpers
 */
export const QueryOptimizations = {
    /**
     * Limit results for paginated queries
     */
    PAGINATION_LIMIT: 20,

    /**
     * Common select fields to reduce payload size
     */
    apartmentListFields: 'id, title, price_huf, district, bedrooms, bathrooms, is_available, main_image',

    /**
     * Use select count for performance
     */
    async getCount(table: string, filters?: any) {
        const supabase = getSupabaseServer();
        let query = supabase.from(table).select('*', { count: 'exact', head: true });

        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value as string | number | boolean);
            });
        }

        const { count } = await query;
        return count || 0;
    },

    /**
     * Batch operations to reduce round trips
     */
    async batchInsert(table: string, records: any[], batchSize: number = 100) {
        const supabase = getSupabaseServer();
        const results: any[] = [];

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            // Dynamic table insert requires bypassing strict Supabase typing
            const tableClient = supabase.from(table) as unknown as { insert: (data: Record<string, unknown>[]) => Promise<{ data: unknown; error: Error | null }> };
            const { data, error } = await tableClient.insert(batch);

            if (error) throw error;
            results.push(data);
        }

        return results.flat();
    },
};

/**
 * Cache commonly accessed data
 */
const cache = new Map<string, { data: any; expiry: number }>();

export const CacheHelper = {
    get(key: string) {
        const cached = cache.get(key);
        if (cached && cached.expiry > Date.now()) {
            return cached.data;
        }
        cache.delete(key);
        return null;
    },

    set(key: string, data: any, ttlSeconds: number = 300) {
        cache.set(key, {
            data,
            expiry: Date.now() + ttlSeconds * 1000,
        });
    },

    clear(key?: string) {
        if (key) {
            cache.delete(key);
        } else {
            cache.clear();
        }
    },
};
