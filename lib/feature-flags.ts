/**
 * Feature Flags System
 * 
 * Enables gradual rollouts, A/B testing, and feature toggles
 * Supports percentage-based rollouts and user/tenant whitelisting
 */

import React from 'react';
import { createClient } from '@/utils/supabaseClient';

export interface FeatureFlag {
    id: string;
    name: string;
    enabled: boolean;
    rollout_percentage: number;
    tenant_whitelist: string[];
    user_whitelist: string[];
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface FlagContext {
    userId?: string;
    tenantId?: string;
    userEmail?: string;
    environment?: 'development' | 'staging' | 'production';
}

export class FeatureFlagService {
    private cache = new Map<string, { flag: FeatureFlag; expiresAt: number }>();
    private cacheExpiry = 60000; // 1 minute

    /**
     * Check if a feature flag is enabled for the given context
     */
    async isEnabled(flagName: string, context: FlagContext = {}): Promise<boolean> {
        const flag = await this.getFlag(flagName);

        if (!flag || !flag.enabled) return false;

        // Whitelist checks (highest priority)
        if (context.tenantId && flag.tenant_whitelist?.includes(context.tenantId)) {
            return true;
        }

        if (context.userId && flag.user_whitelist?.includes(context.userId)) {
            return true;
        }

        // Email-based whitelist (for testing)
        if (context.userEmail && flag.user_whitelist?.some(email =>
            email.includes('@') && email === context.userEmail
        )) {
            return true;
        }

        // Percentage rollout (stable hash-based)
        if (flag.rollout_percentage >= 100) return true;
        if (flag.rollout_percentage <= 0) return false;

        const identifier = context.userId || context.tenantId || context.userEmail || '';
        const hash = this.hashString(`${flagName}:${identifier}`);
        return (hash % 100) < flag.rollout_percentage;
    }

    /**
     * Get all feature flags (for admin dashboard)
     */
    async getAllFlags(): Promise<FeatureFlag[]> {
        const supabase = createClient();

        const { data, error } = await supabase
            .from('feature_flags')
            .select('*')
            .order('name');

        if (error) {
            console.error('Failed to fetch feature flags:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Create or update a feature flag
     */
    async setFlag(flag: Partial<FeatureFlag> & { name: string }): Promise<void> {
        const supabase = createClient();

        const { error } = await supabase
            .from('feature_flags')
            .upsert({
                ...flag,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'name',
            });

        if (error) {
            console.error('Failed to set feature flag:', error);
            throw error;
        }

        // Invalidate cache
        this.cache.delete(flag.name);
    }

    /**
     * Enable a feature flag
     */
    async enable(flagName: string, percentage: number = 100): Promise<void> {
        await this.setFlag({
            name: flagName,
            enabled: true,
            rollout_percentage: percentage,
        });
    }

    /**
     * Disable a feature flag
     */
    async disable(flagName: string): Promise<void> {
        await this.setFlag({
            name: flagName,
            enabled: false,
            rollout_percentage: 0,
        });
    }

    /**
     * Add user to whitelist
     */
    async addToWhitelist(
        flagName: string,
        identifier: string,
        type: 'user' | 'tenant'
    ): Promise<void> {
        const flag = await this.getFlag(flagName);

        if (!flag) {
            throw new Error(`Feature flag '${flagName}' not found`);
        }

        const whitelist = type === 'user' ? (flag.user_whitelist || []) : (flag.tenant_whitelist || []);

        if (!whitelist.includes(identifier)) {
            whitelist.push(identifier);

            await this.setFlag({
                name: flagName,
                [type === 'user' ? 'user_whitelist' : 'tenant_whitelist']: whitelist,
            });
        }
    }

    /**
     * Get a feature flag from database (with caching)
     */
    private async getFlag(name: string): Promise<FeatureFlag | null> {
        const now = Date.now();
        const cached = this.cache.get(name);

        if (cached && cached.expiresAt > now) {
            return cached.flag;
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from('feature_flags')
            .select('*')
            .eq('name', name)
            .single();

        if (error || !data) {
            return null;
        }

        this.cache.set(name, {
            flag: data,
            expiresAt: now + this.cacheExpiry,
        });

        return data;
    }

    /**
     * Stable hash function for percentage rollouts
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Clear cache (useful for testing)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();

// Helper hook for React components
export function useFeatureFlag(flagName: string, context?: FlagContext): boolean {
    const [enabled, setEnabled] = React.useState(false);

    React.useEffect(() => {
        featureFlags.isEnabled(flagName, context).then(setEnabled);
    }, [flagName, context]);

    return enabled;
}
