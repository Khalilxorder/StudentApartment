import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { vi } from 'vitest';

// Extend expect with jest-dom matchers
expect.extend(matchers);

// Clean up after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock Supabase client
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    csv: vi.fn(),
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
      list: vi.fn(),
    })),
  },
  functions: {
    invoke: vi.fn(),
  },
};

// Mock the utils/supabaseClient module
vi.mock('@/utils/supabaseClient', () => ({
  supabase: mockSupabaseClient,
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables
vi.mock('process.env', () => ({
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  RESEND_API_KEY: 'test-resend-key',
  STRIPE_SECRET_KEY: 'sk_test_...',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_...',
}));

// Global test utilities
declare global {
  var testUser: any;
  var testApartment: any;
  var createMockResponse: (data: any, status?: number) => any;
  var nextTick: () => Promise<void>;
}

global.testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    first_name: 'Test',
    last_name: 'User',
  },
};

global.testApartment = {
  id: 'test-apartment-id',
  title: 'Test Apartment',
  description: 'A beautiful test apartment',
  price_huf: 150000,
  bedrooms: 2,
  bathrooms: 1,
  district: 5,
  address: 'Test Street 123',
  owner_id: 'test-owner-id',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Helper function to create mock API responses
global.createMockResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

// Helper function to wait for next tick
global.nextTick = () => new Promise(resolve => setTimeout(resolve, 0));