/**
 * Semantic Search API Endpoint
 * Uses Ollama (Qwen/Llama) embeddings + pgvector for intelligent apartment search
 * Free, open-source, and runs locally!
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { generateEmbedding, checkOllamaHealth } from '@/utils/embeddings';

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

    // Check if Ollama is available
    const isOllamaRunning = await checkOllamaHealth();
    if (!isOllamaRunning) {
      return NextResponse.json(
        { 
          error: 'Ollama service not available', 
          details: 'Please ensure Ollama is running',
          fallback: true
        },
        { status: 503 }
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Create Supabase client
    const supabase = createClient();

    // Call the semantic search function
    const { data, error } = await supabase.rpc('search_apartments_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: 0.4, // Lower threshold for more results
      match_count: limit,
    });

    if (error) {
      console.error('Semantic search error:', error);
      return NextResponse.json(
        { error: 'Search failed', details: error.message, fallback: true },
        { status: 500 }
      );
    }

    // Apply additional filters if provided
    let results = data || [];

    if (filters) {
      if (filters.district) {
        results = results.filter((apt: any) => apt.district === parseInt(filters.district));
      }
      if (filters.bedrooms) {
        results = results.filter((apt: any) => apt.bedrooms >= parseInt(filters.bedrooms));
      }
      if (filters.min_price) {
        results = results.filter((apt: any) => apt.price_huf >= parseInt(filters.min_price));
      }
      if (filters.max_price) {
        results = results.filter((apt: any) => apt.price_huf <= parseInt(filters.max_price));
      }
    }

    const searchTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
      method: 'semantic_ollama',
      model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
      searchTime,
    });

  } catch (error: any) {
    console.error('Semantic search API error:', error);
    
    // Return helpful error if Ollama is not running
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Ollama service not available', 
          details: 'Please ensure Ollama is running at http://localhost:11434',
          fallback: true
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message, fallback: true },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Semantic Search API - Powered by Ollama',
    usage: 'POST with { query: string, filters?: object, limit?: number }',
    model: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
    ollama_url: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    powered_by: 'Ollama + pgvector (Free & Open Source)',
  });
}
