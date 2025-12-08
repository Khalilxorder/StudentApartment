import { createClient } from '@/lib/supabase/server';

/**
 * Get user tier from database (helper)
 */
export async function getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
    try {
        const supabase = createClient();

        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();

        return (profile?.subscription_tier as 'free' | 'pro' | 'enterprise') || 'free';
    } catch {
        return 'free';
    }
}
