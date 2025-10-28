import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabaseClient';
import { pricingService } from '@/services/pricing-svc';

/**
 * GET /api/pricing/estimate
 * Get price estimation for an apartment based on hedonic pricing
 * 
 * Query params:
 * - apartmentId?: string (existing apartment for comparison)
 * - bedrooms?: number
 * - bathrooms?: number
 * - district?: string
 * - size_sqm?: number
 * - amenities?: string[] (comma-separated)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);

    const apartmentId = searchParams.get('apartmentId') || undefined;
    const bedrooms = searchParams.get('bedrooms') ? parseInt(searchParams.get('bedrooms')!) : undefined;
    const bathrooms = searchParams.get('bathrooms') ? parseInt(searchParams.get('bathrooms')!) : undefined;
    const district = searchParams.get('district') || undefined;
    const size_sqm = searchParams.get('size_sqm') ? parseFloat(searchParams.get('size_sqm')!) : undefined;
    const amenitiesParam = searchParams.get('amenities');
    const amenities = amenitiesParam ? amenitiesParam.split(',') : undefined;

    // If apartmentId provided, fetch apartment details
    let apartment = null;
    if (apartmentId) {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .eq('id', apartmentId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
      }
      apartment = data;
    }

    // Prepare pricing input
    const pricingInput = {
      bedrooms: bedrooms || apartment?.bedrooms || 1,
      bathrooms: bathrooms || apartment?.bathrooms || 1,
      district: district || apartment?.district || 'budapest',
      size_sqm: size_sqm || apartment?.size_sqm || 50,
      amenities: amenities || apartment?.amenities || [],
    };

    // Calculate estimated price
    const estimatedPrice = await pricingService.calculateOptimalPrice({
      basePrice: pricingInput.size_sqm * 200, // HUF per sqm base
      location: pricingInput.district,
      rooms: pricingInput.bedrooms,
      amenities: pricingInput.amenities,
      condition: 'good',
      commuteTime: 15,
      marketDemand: 0.7,
      seasonality: 0.8,
      competition: 5,
    });

    // Get comparable apartments for market context
    const { data: comparables } = await supabase
      .from('apartments')
      .select('id, title, monthly_rent_huf, bedrooms, bathrooms, district, size_sqm')
      .eq('district', pricingInput.district)
      .eq('bedrooms', pricingInput.bedrooms)
      .order('monthly_rent_huf', { ascending: false })
      .limit(5);

    // Calculate market stats
    const marketStats = {
      district: pricingInput.district,
      bedrooms: pricingInput.bedrooms,
      avgPrice: comparables?.length
        ? Math.round(comparables.reduce((sum: number, apt: any) => sum + (apt.monthly_rent_huf || 0), 0) / comparables.length)
        : null,
      minPrice: comparables?.length
        ? Math.min(...comparables.map((apt: any) => apt.monthly_rent_huf || 0))
        : null,
      maxPrice: comparables?.length
        ? Math.max(...comparables.map((apt: any) => apt.monthly_rent_huf || 0))
        : null,
      listingCount: comparables?.length || 0,
    };

    // Calculate if estimated price is above/below market
    const pricingAnalysis = {
      estimatedPrice: Math.round(estimatedPrice.suggestedPrice),
      marketAverage: marketStats.avgPrice,
      pricePerSqm: Math.round(estimatedPrice.suggestedPrice / pricingInput.size_sqm),
      marketPercentile: marketStats.avgPrice
        ? Math.round(((estimatedPrice.suggestedPrice - (marketStats.minPrice || 0)) / ((marketStats.maxPrice || estimatedPrice.suggestedPrice) - (marketStats.minPrice || 0))) * 100)
        : null,
      recommendation: calculateRecommendation(estimatedPrice.suggestedPrice, marketStats.avgPrice),
      competitiveness: calculateCompetitiveness(estimatedPrice.suggestedPrice, marketStats.avgPrice, marketStats.minPrice, marketStats.maxPrice),
    };

    return NextResponse.json({
      success: true,
      pricing: pricingAnalysis,
      marketStats,
      comparableListings: comparables?.slice(0, 3).map((apt: any) => ({
        id: apt.id,
        title: apt.title,
        price: apt.monthly_rent_huf,
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        size_sqm: apt.size_sqm,
      })) || [],
    });
  } catch (error) {
    console.error('[pricing/estimate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to estimate price' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Calculate pricing recommendation
 */
function calculateRecommendation(estimated: number, market: number | null): string {
  if (!market) return 'neutral';

  const percentDiff = ((estimated - market) / market) * 100;

  if (percentDiff < -15) return 'underpriced';
  if (percentDiff < -5) return 'competitive';
  if (percentDiff < 5) return 'market_rate';
  if (percentDiff < 15) return 'premium';
  return 'overpriced';
}

/**
 * Helper: Calculate competitiveness score
 */
function calculateCompetitiveness(
  estimated: number,
  market: number | null,
  min: number | null,
  max: number | null
): number {
  if (!market || !min || !max) return 50;

  // Normalize to 0-100 scale
  // 100 = at market average
  // 0 = at market bottom
  const percentOfRange = (estimated - (min || 0)) / ((max || estimated) - (min || 0));
  return Math.max(0, Math.min(100, Math.round(percentOfRange * 100)));
}
