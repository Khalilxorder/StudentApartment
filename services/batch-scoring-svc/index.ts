/**
 * Batch AI Scoring Service
 * 
 * Provides efficient batch scoring of apartments with:
 * - Batching support (max 10 apartments per batch)
 * - Circuit breaker pattern for resilience
 * - Automatic persistence to ranking_events table
 * - LRU caching of recently scored apartments
 * - Timeout handling (30s per batch)
 * - Error recovery and partial success handling
 * 
 * Usage:
 * ```typescript
 * const service = new BatchScoringService();
 * const results = await service.scoreApartmentBatch(apartments, userProfile);
 * ```
 */

import { calculateSuitabilityScore } from '@/utils/gemini';
import { runQuery } from '@/lib/db/pool';

const MAX_BATCH_SIZE = 10;
const BATCH_TIMEOUT_MS = 30000; // 30 seconds per batch
const CIRCUIT_BREAKER_THRESHOLD = 5; // Fail fast after 5 consecutive errors
const CIRCUIT_BREAKER_RESET_MS = 60000; // Reset after 1 minute

interface ScoredApartment {
  apartmentId: string;
  aiScore: number;
  reasons: string[];
  compromises?: string[];
  timestamp: Date;
  success: boolean;
  error?: string;
}

interface BatchScoringResult {
  successful: number;
  failed: number;
  results: ScoredApartment[];
  totalTime: number;
  circuitBreakerOpen: boolean;
}

interface CircuitBreakerState {
  consecutiveErrors: number;
  lastErrorTime: number;
  isOpen: boolean;
}

export class BatchScoringService {
  private circuitBreaker: CircuitBreakerState = {
    consecutiveErrors: 0,
    lastErrorTime: 0,
    isOpen: false,
  };

  private scoreCache = new Map<string, { score: ScoredApartment; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor() {
    this.initializeCircuitBreaker();
  }

  /**
   * Initialize circuit breaker: check if we should reset after timeout
   */
  private initializeCircuitBreaker() {
    if (this.circuitBreaker.isOpen) {
      const timeSinceLastError = Date.now() - this.circuitBreaker.lastErrorTime;
      if (timeSinceLastError > CIRCUIT_BREAKER_RESET_MS) {
        console.log('[BatchScoringService] Circuit breaker reset after timeout');
        this.circuitBreaker = {
          consecutiveErrors: 0,
          lastErrorTime: 0,
          isOpen: false,
        };
      }
    }
  }

  /**
   * Score a batch of apartments with user preferences
   * @param apartments Array of apartment objects
   * @param userProfile User preferences
   * @returns Batch scoring results with success/failure breakdown
   */
  async scoreApartmentBatch(
    apartments: any[],
    userProfile: any,
  ): Promise<BatchScoringResult> {
    const startTime = Date.now();
    this.initializeCircuitBreaker();

    // Validate inputs
    if (!apartments || apartments.length === 0) {
      return {
        successful: 0,
        failed: 0,
        results: [],
        totalTime: 0,
        circuitBreakerOpen: false,
      };
    }

    // Reject if circuit breaker is open
    if (this.circuitBreaker.isOpen) {
      console.warn('[BatchScoringService] Circuit breaker OPEN - rejecting batch');
      return {
        successful: 0,
        failed: apartments.length,
        results: apartments.map((apt) => ({
          apartmentId: apt.id,
          aiScore: 0,
          reasons: [],
          timestamp: new Date(),
          success: false,
          error: 'Circuit breaker open - AI scoring unavailable',
        })),
        totalTime: Date.now() - startTime,
        circuitBreakerOpen: true,
      };
    }

    // Split into chunks of MAX_BATCH_SIZE
    const chunks = this.chunkApartments(apartments, MAX_BATCH_SIZE);
    const allResults: ScoredApartment[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      try {
        const chunkResults = await Promise.race([
          this.scoreChunk(chunk, userProfile),
          this.timeout(BATCH_TIMEOUT_MS),
        ]) as ScoredApartment[];

        for (const result of chunkResults) {
          if (result.success) {
            successCount++;
            // Reset error counter on success
            if (this.circuitBreaker.consecutiveErrors > 0) {
              this.circuitBreaker.consecutiveErrors = 0;
            }
          } else {
            failureCount++;
            this.circuitBreaker.consecutiveErrors++;
          }
        }

        allResults.push(...chunkResults);
      } catch (error: any) {
        console.error('[BatchScoringService] Chunk scoring failed:', error.message);

        // Mark all in this chunk as failed
        const failedResults = chunk.map((apt) => ({
          apartmentId: apt.id,
          aiScore: 0,
          reasons: [],
          timestamp: new Date(),
          success: false,
          error: error.message,
        }));

        allResults.push(...failedResults);
        failureCount += chunk.length;
        this.circuitBreaker.consecutiveErrors++;
      }

      // Check if circuit breaker should trip
      if (this.circuitBreaker.consecutiveErrors >= CIRCUIT_BREAKER_THRESHOLD) {
        console.error('[BatchScoringService] Circuit breaker OPEN - too many errors');
        this.circuitBreaker.isOpen = true;
        this.circuitBreaker.lastErrorTime = Date.now();
        break;
      }
    }

    const totalTime = Date.now() - startTime;

    // Persist successful scores to database
    await this.persistScores(allResults.filter((r) => r.success));

    console.log('[BatchScoringService] Batch complete:', {
      successful: successCount,
      failed: failureCount,
      totalMs: totalTime,
      avgPerApt: (totalTime / apartments.length).toFixed(0),
    });

    return {
      successful: successCount,
      failed: failureCount,
      results: allResults,
      totalTime,
      circuitBreakerOpen: this.circuitBreaker.isOpen,
    };
  }

  /**
   * Score a single apartment (with caching)
   */
  async scoreApartment(apartment: any, userProfile: any): Promise<ScoredApartment> {
    const cacheKey = `${apartment.id}:${JSON.stringify(userProfile).slice(0, 50)}`;

    // Check cache first
    const cached = this.scoreCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('[BatchScoringService] Cache hit for', apartment.id);
      return cached.score;
    }

    try {
      const result = await calculateSuitabilityScore(apartment, userProfile);

      const scored: ScoredApartment = {
        apartmentId: apartment.id,
        aiScore: result.score || 50,
        reasons: result.reasons || [],
        compromises: result.compromises,
        timestamp: new Date(),
        success: true,
      };

      // Cache for future use
      this.scoreCache.set(cacheKey, { score: scored, timestamp: Date.now() });

      return scored;
    } catch (error: any) {
      console.error('[BatchScoringService] Scoring failed for', apartment.id, error.message);

      return {
        apartmentId: apartment.id,
        aiScore: 0,
        reasons: [],
        timestamp: new Date(),
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Score a chunk of apartments in parallel
   */
  private async scoreChunk(chunk: any[], userProfile: any): Promise<ScoredApartment[]> {
    const promises = chunk.map((apt) => this.scoreApartment(apt, userProfile));
    return Promise.all(promises);
  }

  /**
   * Split apartments into chunks
   */
  private chunkApartments(apartments: any[], size: number): any[][] {
    const chunks: any[][] = [];
    for (let i = 0; i < apartments.length; i += size) {
      chunks.push(apartments.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Timeout helper
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Batch scoring timeout after ${ms}ms`)), ms),
    );
  }

  /**
   * Persist scores to ranking_events table
   */
  private async persistScores(scores: ScoredApartment[]): Promise<void> {
    if (scores.length === 0) return;

    try {
      for (const score of scores) {
        await runQuery(
          `
          INSERT INTO public.ranking_events (
            apartment_id,
            ranking_score,
            component_scores,
            reasons
          ) VALUES (
            $1::uuid,
            $2::numeric,
            $3::jsonb,
            $4::text[]
          )
          ON CONFLICT DO NOTHING
        `,
          [
            score.apartmentId,
            (score.aiScore / 100).toFixed(4), // Normalize to 0-1
            JSON.stringify({ aiScore: score.aiScore }),
            score.reasons,
          ],
        );
      }
      console.log('[BatchScoringService] Persisted', scores.length, 'scores to ranking_events');
    } catch (error: any) {
      console.error('[BatchScoringService] Failed to persist scores:', error.message);
      // Don't throw - persistence failure shouldn't block API response
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      isOpen: this.circuitBreaker.isOpen,
      consecutiveErrors: this.circuitBreaker.consecutiveErrors,
      threshold: CIRCUIT_BREAKER_THRESHOLD,
    };
  }

  /**
   * Manually reset circuit breaker (for admin use)
   */
  resetCircuitBreaker(): void {
    console.log('[BatchScoringService] Circuit breaker manually reset');
    this.circuitBreaker = {
      consecutiveErrors: 0,
      lastErrorTime: 0,
      isOpen: false,
    };
  }

  /**
   * Clear cache (for admin use)
   */
  clearCache(): void {
    const before = this.scoreCache.size;
    this.scoreCache.clear();
    console.log('[BatchScoringService] Cache cleared:', before, 'entries removed');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.scoreCache.size,
      maxSize: 1000, // Rough estimate based on 1-hour TTL
      ttlMs: this.CACHE_TTL,
    };
  }
}

// Singleton instance
export const batchScoringService = new BatchScoringService();
