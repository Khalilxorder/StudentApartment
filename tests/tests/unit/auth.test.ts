/**
 * Unit Tests for Authentication Utilities
 * Tests user authentication, session management, and security features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  resetPassword,
  updatePassword,
  verifyEmail,
  refreshSession,
  isAuthenticated,
  requireAuth,
  getUserRole,
  hasPermission,
} from '../../lib/auth';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
      refreshSession: vi.fn(),
      getSession: vi.fn(),
    },
  })),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Authentication Utilities', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
    );
    // Reset all mocks
    Object.values(mockSupabase.auth).forEach((method: any) => {
      if (typeof method.mockReset === 'function') {
        method.mockReset();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('signInWithEmail', () => {
    it('should sign in user successfully', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token', refresh_token: 'refresh' };

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await signInWithEmail('test@example.com', 'password123', mockSupabase);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle sign in error', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await signInWithEmail('wrong@example.com', 'wrongpass', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should validate email format', async () => {
      const result = await signInWithEmail('invalid-email', 'password123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should validate password length', async () => {
      const result = await signInWithEmail('test@example.com', '123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 6 characters');
    });
  });

  describe('signUpWithEmail', () => {
    it('should sign up user successfully', async () => {
      const mockUser = { id: '123', email: 'newuser@example.com' };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const result = await signUpWithEmail('newuser@example.com', 'password123', {
        firstName: 'John',
        lastName: 'Doe',
        role: 'student',
      }, mockSupabase);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
            role: 'student',
          },
        },
      });
    });

    it('should handle sign up error', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      const result = await signUpWithEmail('existing@example.com', 'password123', undefined, mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      const result = await signOut(mockSupabase);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out error', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' },
      });

      const result = await signOut(mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getCurrentUser(mockSupabase);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    it('should handle no authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentUser(mockSupabase);

      expect(result.success).toBe(false);
      expect(result.user).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should send reset password email successfully', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      const result = await resetPassword('test@example.com', mockSupabase);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
        redirectTo: expect.stringContaining('/reset-password'),
      });
    });

    it('should handle reset password error', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: { message: 'Email not found' },
      });

      const result = await resetPassword('nonexistent@example.com', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email not found');
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockSupabase.auth.updateUser.mockResolvedValue({
        data: { user: { id: '123' } },
        error: null,
      });

      const result = await updatePassword('newpassword123', mockSupabase);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newpassword123',
      });
    });

    it('should validate password strength', async () => {
      const result = await updatePassword('123', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password must be at least 6 characters');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: { user: { id: '123' }, session: {} },
        error: null,
      });

      const result = await verifyEmail('token123', 'test@example.com', 'email', mockSupabase);

      expect(result.success).toBe(true);
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: 'token123',
        type: 'email',
      });
    });

    it('should handle verification error', async () => {
      mockSupabase.auth.verifyOtp.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      });

      const result = await verifyEmail('invalidtoken', 'test@example.com', 'email', mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('refreshSession', () => {
    it('should refresh session successfully', async () => {
      const mockSession = { access_token: 'newtoken', refresh_token: 'newrefresh' };

      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const result = await refreshSession(mockSupabase);

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should handle refresh error', async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: null,
        error: { message: 'Refresh failed' },
      });

      const result = await refreshSession(mockSupabase);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh failed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      const result = await isAuthenticated(mockSupabase);

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await isAuthenticated(mockSupabase);

      expect(result).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should allow authenticated user', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      });

      const result = await requireAuth(mockSupabase);

      expect(result.allowed).toBe(true);
    });

    it('should deny unauthenticated user', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const result = await requireAuth(mockSupabase);

      expect(result.allowed).toBe(false);
      expect(result.redirectTo).toBe('/login');
    });
  });

  describe('getUserRole', () => {
    it('should get user role from metadata', async () => {
      const mockUser = {
        id: '123',
        user_metadata: { role: 'student' },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const role = await getUserRole(mockSupabase);

      expect(role).toBe('student');
    });

    it('should return null for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const role = await getUserRole(mockSupabase);

      expect(role).toBeNull();
    });
  });

  describe('hasPermission', () => {
    it('should allow owner to manage apartments', () => {
      const result = hasPermission('owner', 'manage_apartments');
      expect(result).toBe(true);
    });

    it('should allow admin to manage users', () => {
      const result = hasPermission('admin', 'manage_users');
      expect(result).toBe(true);
    });

    it('should deny student from managing apartments', () => {
      const result = hasPermission('student', 'manage_apartments');
      expect(result).toBe(false);
    });

    it('should allow student to view apartments', () => {
      const result = hasPermission('student', 'view_apartments');
      expect(result).toBe(true);
    });
  });
});