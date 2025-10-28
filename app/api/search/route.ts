// Search API endpoint for Student Apartments
// Handles structured search, Meilisearch integration, and semantic search
import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/search-svc';
import { z } from 'zod';
import { rankingService } from '@/services/ranking-svc';
import { personalizationService } from '@/services/personalization-svc';

// Optional telemetry integration (PostHog)
const POSTHOG_INGEST_URL = process.env.POSTHOG_INGEST_URL || 'https://app.posthog.com/capture';
const POSTHOG_KEY = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_API_KEY || '';

// Performance monitoring
const performanceMetrics = {
  requestCount: 0,
  totalLatency: 0,
  latencies: [] as number[],
  p95Latency: 0,
  lastUpdated: Date.now(),
};

function updatePerformanceMetrics(latency: number) {
  performanceMetrics.requestCount++;
  performanceMetrics.totalLatency += latency;
  performanceMetrics.latencies.push(latency);

  // Keep only last 1000 latencies for p95 calculation
  if (performanceMetrics.latencies.length > 1000) {
    performanceMetrics.latencies.shift();
  }

  // Calculate p95 latency
  if (performanceMetrics.latencies.length >= 10) { // Need minimum samples
    const sorted = [...performanceMetrics.latencies].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    performanceMetrics.p95Latency = sorted[p95Index];
  }

  performanceMetrics.lastUpdated = Date.now();
}

function getPerformanceMetrics() {
  return {
    requestCount: performanceMetrics.requestCount,
    averageLatency: performanceMetrics.requestCount > 0
      ? performanceMetrics.totalLatency / performanceMetrics.requestCount
      : 0,
    p95Latency: performanceMetrics.p95Latency,
    lastUpdated: performanceMetrics.lastUpdated,
  };
}

// Search request validation schema
const searchRequestSchema = z.object({
  query: z.string().optional(),
  filters: z.object({
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    district: z.string().optional(),
    amenities: z.array(z.string()).optional(),
    maxCommuteMinutes: z.number().optional(),
    university: z.string().optional(),
    furnished: z.boolean().optional(),
    petsAllowed: z.boolean().optional(),
  }).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().optional(),
  }).optional(),
  sortBy: z.enum(['relevance', 'price_asc', 'price_desc', 'distance', 'newest']).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  userId: z.string().optional(), // For personalization
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();

    // Validate request
    const validatedData = searchRequestSchema.parse(body);
    const {
      query,
      filters = {},
      location,
      sortBy = 'relevance',
      limit = 20,
      offset = 0,
      userId,
    } = validatedData;

    // Convert API filters to search service format
    const searchFilters = {
      budget: filters.priceMin || filters.priceMax ? {
        min: filters.priceMin || 0,
        max: filters.priceMax || 1000000,
      } : undefined,
      rooms: filters.bedrooms,
      furnished: filters.furnished,
      amenities: filters.amenities,
      location: location ? {
        lat: location.latitude,
        lng: location.longitude,
        radius: location.radiusKm ? location.radiusKm * 1000 : 5000, // Convert km to meters
      } : undefined,
      university: filters.university,
      maxCommute: filters.maxCommuteMinutes,
      sortBy: sortBy as any,
      limit,
      offset,
    };

    const [searchResults, total] = await Promise.all([
      searchService.hybridSearch(query || '', searchFilters),
      searchService.getStructuredCount(searchFilters),
    ]);

    // Convert search service results to API format
    const apartments = searchResults.map(result => ({
      id: result.apartment.id,
      title: result.apartment.title,
      description: result.apartment.description,
      price: result.apartment.price,
      rooms: result.apartment.rooms,
      latitude: result.apartment.location.lat,
      longitude: result.apartment.location.lng,
      address: result.apartment.address,
      district: result.apartment.district,
      amenities: result.apartment.amenities,
      photos: result.apartment.photos,
      owner: result.apartment.owner,
      metrics: result.apartment.metrics,
      score: result.score,
      distance: result.distance,
      reasons: result.reasons,
      reasonCodes: result.reasonCodes,
      source: result.source,
    }));

    const latency = Date.now() - startTime;
    updatePerformanceMetrics(latency);

      // Send telemetry if configured (non-blocking but awaited to ensure delivery in dev)
      try {
        await emitSearchTelemetryIfNeeded();
      } catch (err) {
        // Telemetry failure should not break the API
        console.warn('Telemetry send failed:', err);
      }

    // Check p95 latency requirement (250ms)
    const metrics = getPerformanceMetrics();
    if (metrics.p95Latency > 250) {
      console.warn(`Search API p95 latency exceeded: ${metrics.p95Latency}ms (target: 250ms)`);
    }

    return NextResponse.json({
      apartments,
      total,
      offset,
      limit,
      query,
      filters,
      _performance: process.env.NODE_ENV === 'development' ? {
        latency,
        metrics,
      } : undefined,
    });

  } catch (error) {
    const latency = Date.now() - startTime;
    updatePerformanceMetrics(latency);

    console.error('Search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendPostHogEvent(event: string, properties: Record<string, unknown>) {
  if (!POSTHOG_KEY) return;

  try {
    await fetch(POSTHOG_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${POSTHOG_KEY}`,
      },
      body: JSON.stringify({ event, properties }),
    });
  } catch (error) {
    // swallow errors - telemetry must not affect core API
    console.warn('PostHog telemetry error:', error);
  }
}

async function emitSearchTelemetryIfNeeded() {
  if (!POSTHOG_KEY) return;

  const metrics = getPerformanceMetrics();

  // Emit when p95 exceeds threshold, or periodically (every 50 requests)
  const shouldEmit = metrics.p95Latency > 250 || (metrics.requestCount % 50 === 0 && metrics.requestCount > 0);

  if (!shouldEmit) return;

  await sendPostHogEvent('search_api_performance', {
    p95_ms: metrics.p95Latency,
    avg_ms: metrics.averageLatency,
    request_count: metrics.requestCount,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
}

export async function GET() {
  return NextResponse.json({
    performance: getPerformanceMetrics(),
    status: getPerformanceMetrics().p95Latency <= 250 ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
  });
}
