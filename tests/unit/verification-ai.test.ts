import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIDocumentVerificationService } from '@/services/verification-svc';

describe('AIDocumentVerificationService', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.GOOGLE_AI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // Ensure fetch is undefined if it did not exist before
      // @ts-expect-error - deleting global property for test isolation
      delete global.fetch;
    }
    if (originalApiKey) {
      process.env.GOOGLE_AI_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_AI_API_KEY;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error - deleting global property for test isolation
      delete global.fetch;
    }
    if (originalApiKey) {
      process.env.GOOGLE_AI_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_AI_API_KEY;
    }
  });

  it('downloads a document and returns a buffer', async () => {
    const mockBuffer = Buffer.from('test-document');
    const arrayBuffer = mockBuffer.buffer.slice(
      mockBuffer.byteOffset,
      mockBuffer.byteOffset + mockBuffer.byteLength,
    );

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      arrayBuffer: async () => arrayBuffer,
    }));

    delete process.env.GOOGLE_AI_API_KEY;
    const service = new AIDocumentVerificationService();

    const result = await (service as any).downloadDocument('https://example.com/document.pdf');

    expect(result.equals(mockBuffer)).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://example.com/document.pdf', { cache: 'no-store' });
  });

  it('throws an error when the download fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    }));

    delete process.env.GOOGLE_AI_API_KEY;
    const service = new AIDocumentVerificationService();

    await expect(
      (service as any).downloadDocument('https://example.com/missing.pdf')
    ).rejects.toThrow('Failed to download document: 404 Not Found');
  });
});
