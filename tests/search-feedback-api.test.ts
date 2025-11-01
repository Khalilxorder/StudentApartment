import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/db/pool', () => ({
  runQuery: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { createServerClient } from '@supabase/ssr';
import { runQuery } from '@/lib/db/pool';
import { cookies } from 'next/headers';
import { POST } from '@/app/api/search/feedback/route';

describe('POST /api/search/feedback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const cookiesMock = vi.mocked(cookies);
    cookiesMock.mockReturnValue({
      getAll: () => [],
      get: () => undefined,
      has: () => false,
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      [Symbol.iterator]: function* () {
        return;
      },
    } as any);

    vi.mocked(createServerClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '00000000-0000-4000-8000-000000000001' } },
        }),
      },
    } as any);
    vi.mocked(runQuery).mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 400 when payload is invalid', async () => {
    const req = new NextRequest('http://localhost/api/search/feedback', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid feedback payload');
    expect(vi.mocked(runQuery)).not.toHaveBeenCalled();
  });

  it('persists feedback when payload is valid', async () => {
    const payload = {
      apartmentId: '11111111-2222-4333-8999-555555555555',
      helpful: true,
      origin: 'semantic' as const,
      score: 82,
      query: '2 bedroom near ELTE',
      components: {
        displayedScore: 82,
        aiScore: 88,
        featureMatchScore: 75,
        semanticScore: 70,
      },
      reasons: ['Close to metro', 'Good amenities'],
      aiReasons: ['Matches your profile'],
    };

    const req = new NextRequest('http://localhost/api/search/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.durationMs).toBe('number');

    expect(vi.mocked(runQuery)).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(runQuery).mock.calls[0];
    expect(callArgs).toBeTruthy();
    if (!callArgs) {
      throw new Error('runQuery was not invoked');
    }

    const params = callArgs[1] as any[];
    expect(params).toBeTruthy();
    if (!params) {
      throw new Error('runQuery parameters missing');
    }
    expect(params[0]).toBe('00000000-0000-4000-8000-000000000001');
    expect(params[1]).toBe(payload.apartmentId);
    expect(params[2]).toBe('why_this_modal_feedback');
    expect(params[3]).toBe('marked_helpful');
    expect(params[4]).toBe('0.8200');

    const storedComponents = JSON.parse(params[5]);
    expect(storedComponents.origin).toBe('semantic');
    expect(storedComponents.helpful).toBe(1);
    expect(storedComponents.displayedScore).toBe(payload.score);
    expect(storedComponents.aiScore).toBe(payload.components.aiScore);

    const storedReasons = params[6];
    expect(storedReasons).toContain('feedback_helpful');
    expect(storedReasons).toContain('Close to metro');
    expect(storedReasons).toContain('Matches your profile');
  });

  it('falls back to 500 when supabase env missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const payload = {
      apartmentId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      helpful: false,
      origin: 'structured' as const,
    };

    const req = new NextRequest('http://localhost/api/search/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('Server configuration incomplete');
    expect(vi.mocked(runQuery)).not.toHaveBeenCalled();
  });
});
