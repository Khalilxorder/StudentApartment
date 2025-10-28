/* @vitest-environment node */

process.env.GOOGLE_AI_API_KEY = 'test-key';
process.env.GEMINI_MODEL_PRIMARY = 'model-primary';
process.env.GEMINI_MODEL_FALLBACKS = 'model-secondary';

import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/supabaseClient', () => ({
  createServiceRoleClient: vi.fn(() => {
    throw new Error('service role unavailable in tests');
  }),
}));

const importGemini = async () => import('@/utils/gemini');

describe('utils/gemini', () => {
  it('falls back to subsequent models when the primary fails', async () => {
    const { generateTextResponse, calculateSuitabilityScore } = await importGemini();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'primary error',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            { content: { parts: [{ text: 'fallback success' }] } },
          ],
        }),
      });

    global.fetch = fetchMock as unknown as typeof fetch;

    const response = await generateTextResponse('hello test');

    expect(response).toBe('fallback success');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('model-primary');
    expect(fetchMock.mock.calls[1][0]).toContain('model-primary');
    expect(fetchMock.mock.calls[2][0]).toContain('model-secondary');
  });

  it('returns cached suitability scores without re-calling Gemini', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify({ score: 88, reasons: ['match'], compromises: [] }) }] } },
        ],
      }),
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    const apartment = { id: 'apt-1', price_huf: 1000, district: '5', amenities: [], bedrooms: 1, size: 30, rooms: 1 };
    const userProfile = { budget: 1200, location: 'district 5', preferences: ['balcony'] };

    const first = await calculateSuitabilityScore(apartment, userProfile);
    expect(first.score).toBe(88);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockClear();
    fetchMock.mockImplementation(() => {
      throw new Error('fetch should not be called when cache is warm');
    });

    const second = await calculateSuitabilityScore(apartment, userProfile);
    expect(second.score).toBe(88);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
