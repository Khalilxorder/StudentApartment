/**
 * Test Utilities for Integration Tests
 * Provides helpers for database setup, mocking, and common test operations
 */

import { vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Test Supabase client
let testSupabase: SupabaseClient;

export function getTestClient(): SupabaseClient {
    if (!testSupabase) {
        testSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
    }
    return testSupabase;
}

// Generate unique test email
export function generateTestEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
}

// Generate test password
export function generateTestPassword(): string {
    return 'TestPass123!@#';
}

// Cleanup test user
export async function cleanupTestUser(email: string) {
    const supabase = getTestClient();

    try {
        // Sign in as admin to delete user
        const { data: { user } } = await supabase.auth.signInWithPassword({
            email,
            password: generateTestPassword(),
        });

        if (user) {
            await supabase.auth.admin.deleteUser(user.id);
        }
    } catch (error) {
        // User might not exist, ignore
    }
}

// Wait for async operations
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock Stripe
export const mockStripe = {
    paymentIntents: {
        create: vi.fn().mockResolvedValue({
            id: 'pi_test_123',
            client_secret: 'secret_test_123',
            status: 'requires_payment_method',
        }),
        confirm: vi.fn().mockResolvedValue({
            id: 'pi_test_123',
            status: 'succeeded',
        }),
    },
};

// Mock email service
export const mockEmailService = {
    send: vi.fn().mockResolvedValue({ success: true }),
};

// Test data generators
export const testData = {
    user: () => ({
        email: generateTestEmail(),
        password: generateTestPassword(),
        full_name: 'Test User',
    }),

    apartment: () => ({
        title: 'Test Apartment',
        description: 'Test description',
        price_huf: 150000,
        monthly_rent_huf: 150000,
        bedrooms: 2,
        bathrooms: 1,
        size_sqm: 50,
        district: 7,
        address: 'Test Street 123',
        location: 'Budapest',
    }),

    booking: () => ({
        check_in: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        check_out: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }),
};
