/**
 * Embedding service that produces semantic vectors.
 * Integrates with Google Gemini API for production embeddings.
 * Falls back to zero vectors if API is unavailable.
 * 
 * Features:
 * - LRU in-process cache for high-frequency queries
 * - Dimension validation (768 for text-embedding-004)
 * - Fallback to keyword search when API key missing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEmbeddingCache, recordCacheHit, recordCacheMiss } from './cache/lru';

const DEFAULT_MODEL = 'text-embedding-004';
const BASE_DIMENSION = 768;
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;

class EmbeddingService {
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (GEMINI_API_KEY) {
      this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
  }

  /**
   * Generate a normalized embedding for the supplied text.
   * Uses Google Gemini API when available, falls back to zero vector.
   * Caches results to avoid redundant API calls.
   */
  async embedText(text: string | null | undefined): Promise<Float32Array> {
    const cleaned = (text ?? '').trim();
    if (!cleaned) {
      return new Float32Array(BASE_DIMENSION);
    }

    // Check cache first
    const cache = getEmbeddingCache();
    const cached = cache.get(cleaned);
    if (cached) {
      recordCacheHit();
      return cached;
    }

    recordCacheMiss();

    // Try to use Gemini embeddings API
    if (this.client) {
      try {
        const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
        const result = await model.embedContent(cleaned);
        
        if (result.embedding?.values) {
          // Convert to Float32Array and ensure 768 dimensions
          let embedding = new Float32Array(result.embedding.values) as Float32Array;
          embedding = this.ensureDimensions(embedding, BASE_DIMENSION);
          const normalized = this.normalizeVector(embedding);
          
          // Cache for future use
          cache.set(cleaned, normalized);
          return normalized;
        }
      } catch (error) {
        console.warn('Gemini embedding failed, using fallback:', error);
      }
    }

    // Fallback: return a zero vector
    console.warn('Embeddings service: Using fallback zero vector. Configure GOOGLE_AI_API_KEY for production embeddings.');
    const fallback = new Float32Array(BASE_DIMENSION);
    cache.set(cleaned, fallback);
    return fallback;
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async embedTexts(texts: (string | null | undefined)[]): Promise<Float32Array[]> {
    return Promise.all(texts.map(text => this.embedText(text)));
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: Float32Array): Float32Array {
    let magnitude = 0;
    for (let i = 0; i < vector.length; i++) {
      magnitude += vector[i] * vector[i];
    }
    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
      return vector;
    }

    const normalized = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      normalized[i] = vector[i] / magnitude;
    }
    return normalized;
  }

  /**
   * Convert vector to SQL format (for pgvector)
   */
  toSqlVector(vector: Float32Array): string {
    return `[${Array.from(vector).join(',')}]`;
  }

  /**
   * Combine multiple embeddings with weights
   */
  combineEmbeddings(weightedVectors: Array<{ vector: Float32Array; weight: number }>): Float32Array {
    if (!weightedVectors.length) {
      return new Float32Array(BASE_DIMENSION);
    }

    const result = new Float32Array(BASE_DIMENSION);
    let totalWeight = 0;

    for (const { vector, weight } of weightedVectors) {
      for (let i = 0; i < BASE_DIMENSION; i++) {
        result[i] += vector[i] * weight;
      }
      totalWeight += weight;
    }

    // Normalize by total weight
    if (totalWeight > 0) {
      for (let i = 0; i < BASE_DIMENSION; i++) {
        result[i] /= totalWeight;
      }
    }

    return result;
  }

  /**
   * Ensure embedding has the correct dimensions
   */
  ensureDimensions(vector: Float32Array, targetDimensions: number): Float32Array {
    if (vector.length === targetDimensions) {
      return vector;
    }

    if (vector.length < targetDimensions) {
      // Pad with zeros
      const result = new Float32Array(targetDimensions);
      result.set(vector);
      return result;
    } else {
      // Truncate
      return vector.slice(0, targetDimensions);
    }
  }

  /**
   * Validate vector dimensions and throw if mismatch
   */
  validateDimensions(vector: Float32Array, expectedDimensions: number = BASE_DIMENSION): void {
    if (vector.length !== expectedDimensions) {
      throw new Error(
        `[Vector Dimension Mismatch] Expected ${expectedDimensions} dimensions, got ${vector.length}. ` +
        `This may indicate an embedding model change. Rebuild embeddings with: pnpm build:embeddings`
      );
    }
  }
}

export const embeddingService = new EmbeddingService();

/**
 * Legacy export for backward compatibility
 */
export async function embedText(text: string | null | undefined): Promise<Float32Array> {
  return embeddingService.embedText(text);
}

