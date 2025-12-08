import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabaseClient';
import { batchCalculateSuitabilityScores } from '@/utils/gemini';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { query, filters = {} } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get all available apartments with basic filters
    let apartmentsQuery = supabase
      .from('apartments')
      .select('*')
      .eq('is_available', true);

    // Apply basic filters
    if (filters.district) {
      apartmentsQuery = apartmentsQuery.eq('district', filters.district);
    }
    if (filters.minPrice) {
      apartmentsQuery = apartmentsQuery.gte('price_huf', filters.minPrice);
    }
    if (filters.maxPrice) {
      apartmentsQuery = apartmentsQuery.lte('price_huf', filters.maxPrice);
    }
    if (filters.bedrooms) {
      apartmentsQuery = apartmentsQuery.gte('bedrooms', filters.bedrooms);
    }

    const { data: apartments, error } = await apartmentsQuery;

    if (error) {
      logger.error({ error }, 'Database error in AI search');
      return NextResponse.json(
        { error: 'Failed to fetch apartments' },
        { status: 500 }
      );
    }

    if (!apartments || apartments.length === 0) {
      return NextResponse.json({
        results: [],
        total: 0,
        query: query
      });
    }

    // Use AI to calculate suitability scores
    const userProfile = {
      query: query,
      ...filters
    };

    const scoredResults = await batchCalculateSuitabilityScores(apartments, userProfile);

    // Convert Map to array and sort by score (highest first)
    const scoredApartments = Array.from(scoredResults.entries()).map(([id, scoreData]) => {
      const apartment = apartments.find((a: any) => a.id === id);
      return {
        ...apartment,
        aiScore: scoreData.score,
        aiReasoning: scoreData.reasons.join(', '),
        compromises: scoreData.compromises
      };
    }).sort((a, b) => b.aiScore - a.aiScore);

    // Return top results (limit to 20 for performance)
    const topResults = scoredApartments.slice(0, 20);

    return NextResponse.json({
      results: topResults,
      total: topResults.length,
      query: query,
      filters: filters
    });

  } catch (error) {
    logger.error({ error }, 'AI search error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}