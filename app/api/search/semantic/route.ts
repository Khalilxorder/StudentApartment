/**
 * Semantic Search API Endpoint
 * Uses Google Gemini embeddings + pgvector for intelligent apartment search
 * 
 * Features:
 * - LRU caching for frequent queries
 * - Observability: search time, cache hit rate, embedding dimensions
 * - Graceful fallback to keyword search on errors
 * - Structured error codes for debugging
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/search-svc/index';
import { getCacheStats } from '@/lib/cache/lru';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { query, filters, limit = 20 } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Track embedding operation timing
    const embeddingStart = Date.now();
    const results = await searchService.semanticSearch(query, { ...filters, limit });
    const embeddingMs = Date.now() - embeddingStart;

    const totalMs = Date.now() - startTime;
    const cacheStats = getCacheStats();

    // Log observability metrics
    const metrics = {
      embedding_ms: embeddingMs,
      total_ms: totalMs,
      cache_hit_rate: Number(cacheStats.hitRate.toFixed(2)),
      cache_size: cacheStats.size,
      powered_by: 'gemini_768d' as const,
    };

    console.log('[SemanticSearch] Metrics:', JSON.stringify(metrics));

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      method: 'semantic_gemini',
      model: 'text-embedding-004',
      dimensions: 768,
      metrics,
      diagnostics: {
        cacheHitRate: cacheStats.hitRate,
        cacheSize: cacheStats.size,
        embeddingMs,
        totalMs,
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
