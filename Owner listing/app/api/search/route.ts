import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '../../../services/search-svc/index';
import { cache, cacheHelpers } from '../../../lib/cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse search filters from query parameters
    const filters = {
      query: searchParams.get('q') || undefined,
      location: searchParams.get('lat') && searchParams.get('lng') ? {
        lat: parseFloat(searchParams.get('lat')!),
        lng: parseFloat(searchParams.get('lng')!),
        radius: searchParams.get('radius') ? parseFloat(searchParams.get('radius')!) : 5000,
      } : undefined,
      budget: searchParams.get('minPrice') && searchParams.get('maxPrice') ? {
        min: parseFloat(searchParams.get('minPrice')!),
        max: parseFloat(searchParams.get('maxPrice')!),
      } : undefined,
      rooms: searchParams.get('rooms') ? parseInt(searchParams.get('rooms')!) : undefined,
      amenities: searchParams.get('amenities') ? searchParams.get('amenities')!.split(',') : undefined,
      furnished: searchParams.get('furnished') ? searchParams.get('furnished') === 'true' : undefined,
      university: searchParams.get('university') || undefined,
      maxCommute: searchParams.get('maxCommute') ? parseInt(searchParams.get('maxCommute')!) : undefined,
      sortBy: searchParams.get('sortBy') as any || 'relevance',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    // Determine search type
    const searchType = searchParams.get('type') || 'hybrid';

    // Generate cache key
    const cacheKey = cacheHelpers.keys.search(filters.query || '', filters);

    // Try to get from cache
    const results = await cache.getOrSet(
      cacheKey,
      async () => {
        let searchResults;

        switch (searchType) {
          case 'structured':
            searchResults = await searchService.structuredSearch(filters);
            break;
          case 'keyword':
            if (!filters.query) {
              throw new Error('Query required for keyword search');
            }
            searchResults = await searchService.keywordSearch(filters.query, filters);
            break;
          case 'semantic':
            if (!filters.query) {
              throw new Error('Query required for semantic search');
            }
            searchResults = await searchService.semanticSearch(filters.query, filters);
            break;
          case 'hybrid':
          default:
            if (!filters.query) {
              // Fallback to structured search if no query
              searchResults = await searchService.structuredSearch(filters);
            } else {
              searchResults = await searchService.hybridSearch(filters.query, filters);
            }
            break;
        }

        return searchResults;
      },
      {
        ttl: cacheHelpers.ttl.search,
        tags: [cacheHelpers.tags.search()],
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        filters: filters,
        searchType,
        cached: true,
      },
    });

  } catch (error) {
    console.error('Search API error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Query required')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Advanced search with full filter object
    const filters = body.filters || {};
    const searchType = body.searchType || 'hybrid';
    const query = body.query;

    let results;

    switch (searchType) {
      case 'structured':
        results = await searchService.structuredSearch(filters);
        break;
      case 'keyword':
        if (!query) {
          return NextResponse.json({ error: 'Query required for keyword search' }, { status: 400 });
        }
        results = await searchService.keywordSearch(query, filters);
        break;
      case 'semantic':
        if (!query) {
          return NextResponse.json({ error: 'Query required for semantic search' }, { status: 400 });
        }
        results = await searchService.semanticSearch(query, filters);
        break;
      case 'hybrid':
      default:
        if (!query) {
          results = await searchService.structuredSearch(filters);
        } else {
          results = await searchService.hybridSearch(query, filters);
        }
        break;
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        total: results.length,
        query,
        filters,
        searchType,
      },
    });

  } catch (error) {
    console.error('Advanced search API error:', error);
    return NextResponse.json(
      { error: 'Advanced search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}