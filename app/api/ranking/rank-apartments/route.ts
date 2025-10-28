import { NextRequest, NextResponse } from 'next/server';
import { rankingService } from '@/services/ranking-svc';
import { abTestingService } from '@/services/ab-test-svc';
import { runQuery } from '@/lib/db/pool';

export async function POST(request: NextRequest) {
  try {
    const { searchResults, userPreferences, userId } = await request.json();

    if (!searchResults || !userPreferences) {
      return NextResponse.json(
        { error: 'Missing required fields: searchResults, userPreferences' },
        { status: 400 }
      );
    }

    // A/B test: Assign user to ranking algorithm experiment
    const rankingVariant = userId
      ? await abTestingService.getUserVariant(userId, 'ranking_algorithm_v1')
      : null;

    const apartmentIds: string[] = searchResults.map((result: any) => result.apartment.id);

    const metricsQuery = apartmentIds.length
      ? await runQuery(
          `
            SELECT
              a.id,
              a.floor,
              a.has_elevator,
              a.furnished,
              a.media_quality_score,
              a.completeness_score,
              pricing.suggested_price,
              pricing.market_average,
              favorites.favorite_count,
              messages.message_count
            FROM public.apartments a
            LEFT JOIN LATERAL (
              SELECT ps.suggested_price, ps.market_average
              FROM public.pricing_snapshots ps
              WHERE ps.apartment_id = a.id
              ORDER BY ps.created_at DESC
              LIMIT 1
            ) pricing ON TRUE
            LEFT JOIN LATERAL (
              SELECT COUNT(*) AS favorite_count
              FROM public.apartment_favorites fav
              WHERE fav.apartment_id = a.id
            ) favorites ON TRUE
            LEFT JOIN LATERAL (
              SELECT COUNT(*) AS message_count
              FROM public.messages m
              WHERE m.apartment_id = a.id
            ) messages ON TRUE
            WHERE a.id = ANY($1::uuid[])
          `,
          [apartmentIds],
        )
      : { rows: [] };

    const metricsById = new Map<string, any>();
    for (const row of metricsQuery.rows ?? []) {
      metricsById.set(row.id, row);
    }

    // Convert search results to apartment data format
    const apartments = searchResults.map((result: any) => {
      const id = result.apartment.id;
      const metrics = metricsById.get(id) ?? {};
      const searchMetrics = result.apartment.metrics ?? {};

      const suggestedFromSearch = searchMetrics.suggestedPrice;
      const suggestedFromDb = metrics.suggested_price;
      const suggestedPrice = suggestedFromSearch ?? suggestedFromDb ?? null;

      let marketValue = 0.5;
      if (suggestedPrice && suggestedPrice > 0) {
        const delta = Math.abs(result.apartment.price - suggestedPrice) / suggestedPrice;
        marketValue = Math.max(0, 1 - delta);
      } else if (metrics.market_average && metrics.market_average > 0) {
        const delta = Math.abs(result.apartment.price - metrics.market_average) / metrics.market_average;
        marketValue = Math.max(0, 1 - delta);
      }

      return {
        id,
        price: result.apartment.price,
        rooms: result.apartment.rooms,
        location: result.apartment.location,
        address: result.apartment.address,
        district: result.apartment.district,
        amenities: result.apartment.amenities,
        verified: result.apartment.owner.verified,
        mediaScore: typeof searchMetrics.mediaQuality === 'number' ? searchMetrics.mediaQuality : metrics.media_quality_score ?? 0.6,
        completenessScore:
          typeof searchMetrics.completeness === 'number' ? searchMetrics.completeness : metrics.completeness_score ?? 0.6,
        commuteTime: searchMetrics.commuteMinutes ?? null,
        marketValue,
        engagement: {
          views: 0,
          saves: metrics.favorite_count ?? 0,
          messages: metrics.message_count ?? 0,
        },
        floor: metrics.floor ?? null,
        hasElevator: typeof metrics.has_elevator === 'boolean' ? metrics.has_elevator : undefined,
        furnished: typeof metrics.furnished === 'boolean' ? metrics.furnished : undefined,
      };
    });

    // Rank apartments
    const rankingResults = await rankingService.rankApartments(apartments, userPreferences);

    // Calculate statistics
    const scores = rankingResults.map((r) => r.score);
    const rankingStats = {
      totalResults: rankingResults.length,
      averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
      topScore: scores.length ? Math.max(...scores) : 0,
      bottomScore: scores.length ? Math.min(...scores) : 0,
      experimentVariant: rankingVariant || 'baseline',
    };

    // Format response
    const results = rankingResults.map(result => {
      const apartment = searchResults.find((r: any) => r.apartment.id === result.apartmentId);
      return {
        ...apartment,
        rankingScore: result.score,
        rankingComponents: result.components,
        reasons: result.reasons,
        explanations: result.reasons,
        finalScore: result.score,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        results,
        rankingStats,
        experimentInfo: rankingVariant ? {
          experimentId: 'ranking_algorithm_v1',
          variantId: rankingVariant,
          variantName: rankingVariant,
        } : null,
      },
    });

  } catch (error) {
    console.error('Ranking API error:', error);
    return NextResponse.json(
      { error: 'Ranking failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Apartment Ranking API',
    usage: 'POST with { searchResults, userPreferences, userId? }',
    experiments: ['ranking_algorithm_v1', 'search_display_v1'],
  });
}
