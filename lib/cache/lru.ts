/**
 * LRU (Least Recently Used) Cache for embedding vectors
 * Prevents redundant API calls to Gemini for frequently searched terms
 */

export class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // If exists, delete to re-insert at end
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, value);

    // Evict least recently used if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Global embedding cache instance (in-process, ephemeral)
 * - Survives across requests within same process
 * - Clears on process restart
 * - Good for high-frequency query terms (e.g., "1 bed near university")
 */
let embeddingCache: LRUCache<string, Float32Array> | null = null;

export function getEmbeddingCache(): LRUCache<string, Float32Array> {
  if (!embeddingCache) {
    embeddingCache = new LRUCache<string, Float32Array>(1000); // 1000 embedding vectors
    console.log('[Cache] Initialized embedding LRU cache (1000 items)');
  }
  return embeddingCache;
}

/**
 * Cache statistics for observability
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number; // 0 to 1
  size: number;
}

let cacheHits = 0;
let cacheMisses = 0;

export function getCacheStats(): CacheStats {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    hitRate: total > 0 ? cacheHits / total : 0,
    size: getEmbeddingCache().size(),
  };
}

export function recordCacheHit(): void {
  cacheHits++;
}

export function recordCacheMiss(): void {
  cacheMisses++;
}

export function resetCacheStats(): void {
  cacheHits = 0;
  cacheMisses = 0;
}
