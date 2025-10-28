/**
 * Semantic Search API Endpoint
 * Uses Google Gemini embeddings + pgvector for intelligent apartment search
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '../../../../services/search-svc/index';

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

    // Use the search service for semantic search
    const results = await searchService.semanticSearch(query, { ...filters, limit });

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      method: 'semantic_gemini',
      model: 'text-embedding-004',
      searchTime,
    });

  } catch (error: any) {
    console.error('Semantic search API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message, fallback: true },
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
