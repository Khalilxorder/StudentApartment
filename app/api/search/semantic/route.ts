/**
 * Semantic Search API Endpoint
 * Uses Google Gemini embeddings + pgvector for intelligent apartment search
 * Includes AI scoring and ranking persistence for bandit learning
 * 
 * Features:
 * - LRU caching for frequent queries
 * - AI scoring of results with circuit breaker protection
 * - Batch scoring for efficiency
 * - Observability: search time, cache hit rate, embedding dimensions
 * - Graceful fallback to keyword search on errors
 * - Structured error codes for debugging
 * - Automatic persistence to ranking_events table
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/search-svc/index';
import { batchScoringService } from '@/services/batch-scoring-svc';
import { getCacheStats } from '@/lib/cache/lru';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Optional: Get user context for AI scoring
    let userId: string | null = null;
    try {
      const cookieStore = cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options),
                );
              } catch {
                // Cookie setting may fail in some scenarios
              }
            },
          },
        },
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
      }
    } catch (err) {
      // User context is optional
      console.debug('[SemanticSearch] Could not get user context for AI scoring');
    }

    const { query, filters, limit = 20, includeAiScore = true } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Track embedding operation timing
    const embeddingStart = Date.now();
    let results = await searchService.semanticSearch(query, { ...filters, limit });
    const embeddingMs = Date.now() - embeddingStart;

    // Optional: Add AI scoring if requested and user exists
    let aiScoredResults = results;
    let aiScoringMs = 0;

    if (includeAiScore && userId && results.length > 0) {
      const aiScoringStart = Date.now();
      try {
        // Extract user profile from filters for scoring context
        const userProfile = {
          budget: filters?.budget,
          preferences: filters?.amenities || [],
          location: filters?.location,
        };

        // Score all results in batch
        const scoringResult = await batchScoringService.scoreApartmentBatch(
          results,
          userProfile,
        );

        aiScoringMs = Date.now() - aiScoringStart;

        // Merge AI scores with results
        aiScoredResults = results.map((apt, idx) => {
          const scoreData = scoringResult.results[idx];
          return {
            ...apt,
            aiScore: scoreData?.aiScore || null,
            aiReasons: scoreData?.reasons || [],
            scoringSuccess: scoreData?.success,
          };
        });

        // Log AI scoring metrics
        console.log('[SemanticSearch] AI Scoring:', {
          attempted: results.length,
          successful: scoringResult.successful,
          failed: scoringResult.failed,
          totalMs: scoringResult.totalTime,
        });
      } catch (error: any) {
        console.warn('[SemanticSearch] AI scoring failed:', error.message);
        // Continue with results without AI scores
        aiScoringMs = Date.now() - aiScoringStart;
      }
    }

    const totalMs = Date.now() - startTime;
    const cacheStats = getCacheStats();

    // Log observability metrics
    const metrics = {
      embedding_ms: embeddingMs,
      ai_scoring_ms: aiScoringMs,
      total_ms: totalMs,
      cache_hit_rate: Number(cacheStats.hitRate.toFixed(2)),
      cache_size: cacheStats.size,
      powered_by: 'gemini_768d' as const,
    };

    console.log('[SemanticSearch] Metrics:', JSON.stringify(metrics));

    return NextResponse.json({
      success: true,
      results: aiScoredResults,
      count: aiScoredResults.length,
      method: 'semantic_gemini_with_ai_scoring',
      model: 'text-embedding-004',
      dimensions: 768,
      metrics,
      diagnostics: {
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size,
        embeddingMs,
        aiScoringMs,
        totalMs,
        userIdPresent: !!userId,
      },
    });

  } catch (error: any) {
    const errorCode = error?.message?.includes('[Vector Dimension Mismatch]') 
      ? 'VECTOR_DIM_MISMATCH' 
      : error?.code === 'ECONNREFUSED' 
      ? 'EMBEDDING_SERVICE_UNAVAILABLE'
      : 'EMBEDDING_ERROR';

    console.error('[SemanticSearch] Error:', {
      code: errorCode,
      message: error?.message,
      totalMs: Date.now() - startTime,
    });
    
    return NextResponse.json(
      {
        error: 'Semantic search failed',
        code: errorCode,
        details: error?.message,
        fallback: true, // Client should fall back to keyword search
        metrics: {
          total_ms: Date.now() - startTime,
          powered_by: 'error_fallback' as const,
        },
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Semantic Search API - Powered by Google Gemini',
    usage: 'POST with { query: string, filters?: object, limit?: number }',
    model: 'text-embedding-004',
    embedding_dimensions: 768,
    powered_by: 'Google Gemini + pgvector',
  });
}
