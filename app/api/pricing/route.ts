import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

interface PricingFactors {
  apartment_id: string;
  base_price: number;
  location_score: number;
  demand_score: number;
  seasonality_multiplier: number;
  competitor_adjustment: number;
  amenities_score: number;
  condition_score: number;
}

interface PricingRecommendation {
  apartment_id: string;
  current_price: number;
  recommended_price: number;
  confidence_score: number;
  factors: PricingFactors;
  expected_occupancy: number;
  revenue_impact: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apartmentId = searchParams.get('apartment_id');

    if (apartmentId) {
      // Get pricing recommendation for specific apartment
      const recommendation = await getPricingRecommendation(apartmentId);
      return NextResponse.json({ recommendation });
    } else {
      // Get pricing recommendations for all apartments
      const recommendations = await getAllPricingRecommendations();
      return NextResponse.json({ recommendations });
    }
  } catch (error) {
    console.error('Error in pricing API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { apartment_id, new_price, reason } = await request.json();

    if (!apartment_id || !new_price) {
      return NextResponse.json({ error: 'Missing apartment_id or new_price' }, { status: 400 });
    }

    // Update apartment price
    const { error: updateError } = await getSupabaseClient()`n      .from('apartments')
      .update({
        price_huf: new_price,
        updated_at: new Date().toISOString(),
      })
      .eq('id', apartment_id);

    if (updateError) {
      console.error('Error updating apartment price:', updateError);
      return NextResponse.json({ error: 'Failed to update price' }, { status: 500 });
    }

    // Log the price change
    await getSupabaseClient()`n      .from('pricing_history')
      .insert({
        apartment_id,
        old_price: null, // Would need to fetch current price first
        new_price,
        change_reason: reason || 'Manual adjustment',
        changed_by: 'system', // In real implementation, this would be the user ID
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in pricing POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getPricingRecommendation(apartmentId: string): Promise<PricingRecommendation | null> {
  try {
    // Get apartment details
    const { data: apartment, error } = await getSupabaseClient()`n      .from('apartments')
      .select('*')
      .eq('id', apartmentId)
      .single();

    if (error || !apartment) {
      return null;
    }

    // Calculate pricing factors
    const factors = await calculatePricingFactors(apartment);

    // Calculate recommended price using ML model (simplified version)
    const recommendedPrice = calculateRecommendedPrice(factors);

    // Calculate confidence score based on data availability
    const confidenceScore = calculateConfidenceScore(factors);

    // Estimate expected occupancy
    const expectedOccupancy = estimateOccupancy(factors);

    // Calculate revenue impact
    const revenueImpact = (recommendedPrice - apartment.price_huf) * expectedOccupancy * 30; // Monthly estimate

    return {
      apartment_id: apartmentId,
      current_price: apartment.price_huf,
      recommended_price: recommendedPrice,
      confidence_score: confidenceScore,
      factors,
      expected_occupancy: expectedOccupancy,
      revenue_impact: revenueImpact,
    };
  } catch (error) {
    console.error('Error getting pricing recommendation:', error);
    return null;
  }
}

async function getAllPricingRecommendations(): Promise<PricingRecommendation[]> {
  try {
    const { data: apartments, error } = await getSupabaseClient()`n      .from('apartments')
      .select('*')
      .limit(50); // Limit for performance

    if (error) {
      return [];
    }

    const recommendations: PricingRecommendation[] = [];

    for (const apartment of apartments || []) {
      const recommendation = await getPricingRecommendation(apartment.id);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations.sort((a, b) => Math.abs(b.revenue_impact) - Math.abs(a.revenue_impact));
  } catch (error) {
    console.error('Error getting all pricing recommendations:', error);
    return [];
  }
}

async function calculatePricingFactors(apartment: any): Promise<PricingFactors> {
  // Location score based on district and proximity to universities
  const locationScore = calculateLocationScore(apartment.district, apartment.lat, apartment.lng);

  // Demand score based on recent searches and bookings in the area
  const demandScore = await calculateDemandScore(apartment.district);

  // Seasonality multiplier (higher in September, lower in summer)
  const seasonalityMultiplier = calculateSeasonalityMultiplier();

  // Competitor adjustment based on similar apartments in the area
  const competitorAdjustment = await calculateCompetitorAdjustment(apartment);

  // Amenities score
  const amenitiesScore = calculateAmenitiesScore(apartment);

  // Condition score based on age and reported issues
  const conditionScore = calculateConditionScore(apartment);

  return {
    apartment_id: apartment.id,
    base_price: apartment.price_huf,
    location_score: locationScore,
    demand_score: demandScore,
    seasonality_multiplier: seasonalityMultiplier,
    competitor_adjustment: competitorAdjustment,
    amenities_score: amenitiesScore,
    condition_score: conditionScore,
  };
}

function calculateLocationScore(district: number, lat?: number, lng?: number): number {
  // Budapest districts closer to city center and universities score higher
  const districtScores: { [key: number]: number } = {
    1: 1.0,   // City center
    5: 0.95,  // Near center
    6: 0.9,   // University area
    7: 0.85,  // Good location
    8: 0.8,   // Decent location
    9: 0.75,  // Further out
    11: 0.9,  // University area
    12: 0.7,  // Residential
    13: 0.8,  // Mixed area
    // Default for other districts
  };

  return districtScores[district] || 0.6;
}

async function calculateDemandScore(district: number): Promise<number> {
  try {
    // Count recent searches in this district
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: searchCount } = await getSupabaseClient()`n      .from('search_queries')
      .select('*', { count: 'exact', head: true })
      .eq('district', district)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Count recent bookings
    const { count: bookingCount } = await getSupabaseClient()`n      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('apartment_district', district)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Normalize to 0-1 scale
    const searchScore = Math.min(searchCount || 0, 100) / 100;
    const bookingScore = Math.min(bookingCount || 0, 20) / 20;

    return (searchScore + bookingScore) / 2;
  } catch (error) {
    return 0.5; // Default moderate demand
  }
}

function calculateSeasonalityMultiplier(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12

  // Peak season: September (students returning), October
  // Low season: July, August (summer break)
  const seasonalMultipliers: { [key: number]: number } = {
    1: 0.9,   // January
    2: 0.9,   // February
    3: 0.95,  // March
    4: 0.95,  // April
    5: 0.9,   // May
    6: 0.85,  // June
    7: 0.8,   // July
    8: 0.8,   // August
    9: 1.0,   // September (peak)
    10: 0.95, // October
    11: 0.9,  // November
    12: 0.85, // December
  };

  return seasonalMultipliers[month] || 0.9;
}

async function calculateCompetitorAdjustment(apartment: any): Promise<number> {
  try {
    // Find similar apartments in the same district
    const { data: competitors } = await getSupabaseClient()`n      .from('apartments')
      .select('price_huf, bedrooms, bathrooms')
      .eq('district', apartment.district)
      .neq('id', apartment.id)
      .eq('is_active', true);

    if (!competitors || competitors.length === 0) {
      return 1.0; // No adjustment if no competitors
    }

    // Calculate average price of similar apartments
    const similarCompetitors = competitors.filter((comp: any) =>
      Math.abs(comp.bedrooms - apartment.bedrooms) <= 1 &&
      Math.abs(comp.bathrooms - apartment.bathrooms) <= 1
    );

    if (similarCompetitors.length === 0) {
      return 1.0;
    }

    const avgCompetitorPrice = similarCompetitors.reduce((sum: number, comp: any) => sum + comp.price_huf, 0) / similarCompetitors.length;

    // Return adjustment factor (1.0 = same as competitors, >1 = higher, <1 = lower)
    return apartment.price_huf / avgCompetitorPrice;
  } catch (error) {
    return 1.0;
  }
}

function calculateAmenitiesScore(apartment: any): number {
  let score = 0.5; // Base score

  // Add points for amenities (this would be expanded based on your data model)
  if (apartment.has_balcony) score += 0.1;
  if (apartment.has_parking) score += 0.1;
  if (apartment.has_elevator) score += 0.05;
  if (apartment.pet_friendly) score += 0.05;
  if (apartment.furnished) score += 0.1;

  return Math.min(score, 1.0);
}

function calculateConditionScore(apartment: any): number {
  // This would be based on apartment age, renovation status, etc.
  // For now, return a default score
  return 0.8;
}

function calculateRecommendedPrice(factors: PricingFactors): number {
  // Simple linear model for pricing recommendation
  const basePrice = factors.base_price;

  let adjustmentFactor =
    factors.location_score * 0.3 +
    factors.demand_score * 0.25 +
    factors.amenities_score * 0.15 +
    factors.condition_score * 0.1 +
    (factors.seasonality_multiplier - 0.9) * 0.1 + // Normalize seasonality
    (factors.competitor_adjustment - 1.0) * 0.1;   // Normalize competitor adjustment

  // Ensure reasonable bounds (-50% to +100%)
  adjustmentFactor = Math.max(-0.5, Math.min(1.0, adjustmentFactor));

  return Math.round(basePrice * (1 + adjustmentFactor));
}

function calculateConfidenceScore(factors: PricingFactors): number {
  // Higher confidence when we have more data
  let confidence = 0.5; // Base confidence

  if (factors.demand_score > 0.3) confidence += 0.2;
  if (factors.competitor_adjustment !== 1.0) confidence += 0.2;
  if (factors.location_score > 0.7) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

function estimateOccupancy(factors: PricingFactors): number {
  // Estimate monthly occupancy rate based on various factors
  let occupancyRate = 0.7; // Base 70% occupancy

  if (factors.demand_score > 0.7) occupancyRate += 0.2;
  if (factors.location_score > 0.8) occupancyRate += 0.1;
  if (factors.amenities_score > 0.7) occupancyRate += 0.05;

  return Math.min(occupancyRate, 0.95); // Max 95% occupancy
}