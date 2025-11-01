/**
 * Unit Tests: Embedding Service
 * Tests dimension enforcement, caching, and fallback behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { embeddingService } from '@/lib/embeddings';
import { getEmbeddingCache, getCacheStats, resetCacheStats } from '@/lib/cache/lru';

describe('EmbeddingService', () => {
  beforeEach(() => {
    resetCacheStats();
  });

  describe('Dimension Enforcement', () => {
    it('should enforce 768 dimensions for valid vectors', async () => {
      const vector = new Float32Array(768).fill(0.5);
      expect(() => embeddingService.validateDimensions(vector, 768)).not.toThrow();
    });

    it('should throw on dimension mismatch', () => {
      const vector = new Float32Array(384).fill(0.5);
      expect(() => embeddingService.validateDimensions(vector, 768)).toThrow(
        /[Vector Dimension Mismatch]/
      );
    });

    it('should pad vectors below target dimensions', () => {
      const vector = new Float32Array([1, 2, 3]);
      const padded = embeddingService.ensureDimensions(vector, 768);
      expect(padded.length).toBe(768);
      expect(padded[0]).toBe(1);
      expect(padded[2]).toBe(3);
      expect(padded[767]).toBe(0); // Padding
    });

    it('should truncate vectors above target dimensions', () => {
      const vector = new Float32Array(1536).fill(0.5);
      const truncated = embeddingService.ensureDimensions(vector, 768);
      expect(truncated.length).toBe(768);
    });
  });

  describe('Vector Normalization', () => {
    it('should normalize vectors to unit length', async () => {
      const vector = new Float32Array([3, 4]); // magnitude = 5
      const normalized = embeddingService['normalizeVector'](vector);
      expect(normalized[0]).toBeCloseTo(0.6, 4); // 3/5
      expect(normalized[1]).toBeCloseTo(0.8, 4); // 4/5
    });

    it('should handle zero vectors', () => {
      const vector = new Float32Array([0, 0, 0]);
      const normalized = embeddingService['normalizeVector'](vector);
      expect(Array.from(normalized)).toEqual([0, 0, 0]);
    });
  });

  describe('Embedding Generation', () => {
    it('should return zero vector for empty text', async () => {
      const result = await embeddingService.embedText('');
      expect(result.length).toBe(768);
      expect(Array.from(result).every(v => v === 0)).toBe(true);
    });

    it('should return zero vector for null/undefined', async () => {
      const result1 = await embeddingService.embedText(null);
      const result2 = await embeddingService.embedText(undefined);
      expect(result1.length).toBe(768);
      expect(result2.length).toBe(768);
    });
  });

  describe('SQL Vector Conversion', () => {
    it('should convert Float32Array to pgvector format', () => {
      const vector = new Float32Array([0.1, 0.2, 0.3]);
      const sql = embeddingService.toSqlVector(vector);
      expect(sql).toMatch(/^\[0\.1,0\.2,0\.3\]$/);
    });

    it('should handle large vectors', () => {
      const vector = new Float32Array(768).fill(0.123);
      const sql = embeddingService.toSqlVector(vector);
      expect(sql.startsWith('[')).toBe(true);
      expect(sql.endsWith(']')).toBe(true);
    });
  });

  describe('Vector Combination', () => {
    it('should combine weighted vectors', () => {
      const v1 = new Float32Array([1, 0, 0]);
      const v2 = new Float32Array([0, 1, 0]);
      const result = embeddingService['combineEmbeddings']([
        { vector: v1, weight: 0.7 },
        { vector: v2, weight: 0.3 },
      ]);
      expect(result[0]).toBeCloseTo(0.7, 2);
      expect(result[1]).toBeCloseTo(0.3, 2);
    });

    it('should handle empty vector list', () => {
      const result = embeddingService['combineEmbeddings']([]);
      expect(result.length).toBe(768);
    });
  });
});

describe('Embedding Cache (LRU)', () => {
  beforeEach(() => {
    resetCacheStats();
  });

  it('should cache embeddings by text', async () => {
    const cache = getEmbeddingCache();
    const vector1 = new Float32Array(768).fill(0.5);
    
    cache.set('test query', vector1);
    const retrieved = cache.get('test query');
    
    expect(retrieved).toBe(vector1);
  });

  it('should track cache hits and misses', () => {
    const cache = getEmbeddingCache();
    cache.set('hit', new Float32Array(768));
    cache.get('hit'); // Hit
    cache.get('miss'); // Miss
    
    const stats = getCacheStats();
    expect(stats.hitRate).toBeCloseTo(0.5, 1);
  });

  it('should evict LRU entries on overflow', () => {
    const cache = getEmbeddingCache();
    // Note: This test depends on cache max size (1000)
    // Fill cache beyond capacity
    for (let i = 0; i < 1100; i++) {
      cache.set(`key-${i}`, new Float32Array(768));
    }
    // Oldest entries should be gone
    expect(cache.has('key-0')).toBe(false);
    expect(cache.has('key-1099')).toBe(true);
  });

  it('should reorder entries on access', () => {
    const cache = getEmbeddingCache();
    const vec = new Float32Array(768);
    
    cache.set('first', vec);
    cache.set('second', vec);
    
    // Access 'first' to make it most recently used
    cache.get('first');
    
    // Add one more to trigger eviction of 'second' (LRU)
    cache.set('third', vec);
    
    expect(cache.has('first')).toBe(true);
    expect(cache.has('second')).toBe(false);
  });
});
