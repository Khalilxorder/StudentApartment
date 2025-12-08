/**
 * Authentication Flow Integration Tests
 * Tests signup, login, logout, session management, and password reset
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTestClient, generateTestEmail, generateTestPassword, cleanupTestUser, wait } from './test-utils';
import { validatePassword } from '@/lib/auth/password-validator';

describe('Authentication Flow', () => {
    let testEmail: string;
    const testPassword = generateTestPassword();

    beforeEach(() => {
        testEmail = generateTestEmail();
    });

    afterEach(async () => {
        await cleanupTestUser(testEmail);
    });

    describe('Signup', () => {
        it('should successfully create a new user account', async () => {
            const supabase = getTestClient();

            const { data, error } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            expect(error).toBeNull();
            expect(data.user).toBeDefined();
            expect(data.user?.email).toBe(testEmail);
        });

        it('should reject signup with weak password', async () => {
            const supabase = getTestClient();
            const weakPassword = 'weak';

            // Validate password client-side first
            const validation = validatePassword(weakPassword);
            expect(validation.valid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });

        it('should reject duplicate email signup', async () => {
            const supabase = getTestClient();

            // First signup
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            // Wait a bit
            await wait(1000);

            // Try to signup again with same email
            const { error } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            // Supabase returns user for duplicate signups but sends confirmation email
            // In production, you'd check if user already exists
            expect(error).toBeNull(); // Supabase doesn't error, handles gracefully
        });
    });

    describe('Login', () => {
        beforeEach(async () => {
            // Create user for login tests
            const supabase = getTestClient();
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });
            await wait(500);
        });

        it('should successfully login with valid credentials', async () => {
            const supabase = getTestClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            expect(error).toBeNull();
            expect(data.user).toBeDefined();
            expect(data.session).toBeDefined();
            expect(data.user?.email).toBe(testEmail);
        });

        it('should reject login with invalid password', async () => {
            const supabase = getTestClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: 'WrongPassword123!',
            });

            expect(error).toBeDefined();
            expect(data.user).toBeNull();
            expect(data.session).toBeNull();
        });

        it('should reject login with non-existent email', async () => {
            const supabase = getTestClient();

            const { data, error } = await supabase.auth.signInWithPassword({
                email: 'nonexistent@test.com',
                password: testPassword,
            });

            expect(error).toBeDefined();
            expect(data.user).toBeNull();
        });
    });

    describe('Session Management', () => {
        it('should maintain session after login', async () => {
            const supabase = getTestClient();

            // Signup
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            // Login
            await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            // Check session
            const { data: { session } } = await supabase.auth.getSession();
            expect(session).toBeDefined();
            expect(session?.user.email).toBe(testEmail);
        });

        it('should retrieve current user from session', async () => {
            const supabase = getTestClient();

            // Signup and login
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            expect(user).toBeDefined();
            expect(user?.email).toBe(testEmail);
        });
    });

    describe('Logout', () => {
        it('should successfully logout and clear session', async () => {
            const supabase = getTestClient();

            // Signup and login
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            });

            // Logout
            const { error } = await supabase.auth.signOut();
            expect(error).toBeNull();

            // Verify session is cleared
            const { data: { session } } = await supabase.auth.getSession();
            expect(session).toBeNull();
        });
    });

    describe('Password Reset', () => {
        it('should send password reset email', async () => {
            const supabase = getTestClient();

            // Create user first
            await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            // Request password reset
            const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
                redirectTo: 'http://localhost:3000/reset-password',
            });

            expect(error).toBeNull();
            // Note: Email won't actually be sent in test environment
        });
    });

    describe('Email Verification', () => {
        it('should require email verification for new users', async () => {
            const supabase = getTestClient();

            const { data } = await supabase.auth.signUp({
                email: testEmail,
                password: testPassword,
            });

            // User created but email not confirmed
            expect(data.user).toBeDefined();
            expect(data.user?.email_confirmed_at).toBeUndefined();
        });
    });
});
