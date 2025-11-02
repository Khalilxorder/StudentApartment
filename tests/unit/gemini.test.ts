/* @vitest-environment node */

process.env.GOOGLE_AI_API_KEY = 'test-key';
process.env.GEMINI_MODEL_PRIMARY = 'gemini-2.5-flash';
process.env.GEMINI_MODEL_FALLBACKS = 'gemini-2.0-flash-exp';

import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabaseClient', () => ({
  createServiceRoleClient: vi.fn(() => {
    throw new Error('service role unavailable in tests');
  }),
}));

describe('utils/gemini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generateTextResponse returns successful response', async () => {
    const { generateTextResponse } = await import('@/utils/gemini');
    
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: 'success response' }] } },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;
    const response = await generateTextResponse('hello test');

    expect(response).toBe('success response');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('calculateSuitabilityScore returns cached results on second call', async () => {
    const { calculateSuitabilityScore } = await import('@/utils/gemini');
    
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ score: 88, reasons: [{ factor: 'match', description: 'good fit', impact: 10 }], compromises: [] }) }] } },
          ],
        }),
      };
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const apartment = { id: 'apt-1', price_huf: 1000, district: '5', amenities: [], bedrooms: 1, size: 30, rooms: 1, title: 'Test Apt' };
    const userProfile = { budget: 1200, location: 'district 5', preferences: ['balcony'] };

    // First call
    const first = await calculateSuitabilityScore(apartment, userProfile);
    expect(first.score).toBe(88);
    const firstCallCount = callCount;

    // Second call (should use cache)
    const second = await calculateSuitabilityScore(apartment, userProfile);
    expect(second.score).toBe(88);
    expect(callCount).toBe(firstCallCount); // Should not increment
  });
});
