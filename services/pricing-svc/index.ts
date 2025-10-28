import { runQuery } from '@/lib/db/pool';

export interface PricingFactors {
  basePrice: number;
  location: string;
  rooms: number;
  amenities: string[];
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  commuteTime: number; // minutes to nearest university
  marketDemand: number; // 0-1 scale
  seasonality: number; // 0-1 scale (peak vs off-peak)
  competition: number; // number of similar apartments nearby
}

export interface PricingRecommendation {
  suggestedPrice: number;
  confidence: number;
  range: { min: number; max: number };
  factors: Record<string, number>;
  marketComparison: {
    average: number;
    percentile25: number;
    percentile75: number;
  };
}

export interface RevenueOptimization {
  currentRevenue: number;
  potentialRevenue: number;
  optimizationSuggestions: string[];
  expectedImprovement: number;
}

interface ComparableApartment {
  price: number;
  rooms: number;
  amenityCount: number;
  furnished: boolean;
  hasElevator: boolean;
  commute: number | null;
  size: number | null;
}

export class PricingService {
  async calculateOptimalPrice(factors: PricingFactors): Promise<PricingRecommendation> {
    const comparables = await this.getComparables(factors);
    const stats = this.computeComparableStats(comparables, factors.basePrice);
    const adjustments = this.calculateAdjustments(factors, stats);
    const suggestedPrice = Math.round(stats.median + adjustments.totalAdjustment);
    const confidence = this.estimateConfidence(comparables.length, factors);

    return {
      suggestedPrice,
      confidence,
      range: {
        min: Math.round(stats.percentile25),
        max: Math.round(stats.percentile75),
      },
      factors: adjustments.breakdown,
      marketComparison: {
        average: Math.round(stats.average),
        percentile25: Math.round(stats.percentile25),
        percentile75: Math.round(stats.percentile75),
      },
    };
  }

  async optimizeRevenue(apartmentId: string, currentPrice: number): Promise<RevenueOptimization> {
    const { rows } = await runQuery(
      `
        SELECT
          a.monthly_rent_huf AS price,
          COALESCE(pricing.suggested_price, 0) AS suggested_price
        FROM public.apartments a
        LEFT JOIN LATERAL (
          SELECT ps.suggested_price
          FROM public.pricing_snapshots ps
          WHERE ps.apartment_id = a.id
          ORDER BY ps.created_at DESC
          LIMIT 1
        ) pricing ON true
        WHERE a.id = $1
      `,
      [apartmentId],
    );

    const listing = rows[0] ?? { price: currentPrice, suggested_price: currentPrice };
    const recommendedPrice = listing.suggested_price || currentPrice;
    const delta = recommendedPrice - currentPrice;
    const expectedImprovement = Math.min(Math.abs(delta) / Math.max(currentPrice, 1), 0.2);
    const suggestions: string[] = [];

    if (delta > 0) {
      suggestions.push(`Increase rent by ${Math.round(delta)} HUF to align with market comparables.`);
    } else if (delta < 0) {
      suggestions.push(`Reduce rent by ${Math.round(Math.abs(delta))} HUF to improve competitiveness.`);
    }

    if (!suggestions.length) {
      suggestions.push('Current pricing is aligned with market data. Focus on amenity upgrades to boost appeal.');
    }

    return {
      currentRevenue: currentPrice,
      potentialRevenue: recommendedPrice,
      optimizationSuggestions: suggestions,
      expectedImprovement,
    };
  }

  async batchOptimizePricing(
    apartments: Array<{ id: string; factors: PricingFactors }>,
  ): Promise<Map<string, PricingRecommendation>> {
    const results = new Map<string, PricingRecommendation>();
    for (const apartment of apartments) {
      const recommendation = await this.calculateOptimalPrice(apartment.factors);
      results.set(apartment.id, recommendation);
    }
    return results;
  }

  private async getComparables(factors: PricingFactors): Promise<ComparableApartment[]> {
    const priceWindow = {
      min: Math.max(30_000, factors.basePrice * 0.6),
      max: Math.max(factors.basePrice * 1.4, factors.basePrice + 50_000),
    };

    const { rows } = await runQuery(
      `
        SELECT
          a.monthly_rent_huf AS price,
          a.room_count AS rooms,
          a.size_sqm AS size,
          a.furnished,
          a.has_elevator,
          COALESCE(amenities.amenity_count, 0) AS amenity_count,
          commute.avg_commute
        FROM public.apartments a
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS amenity_count
          FROM public.apartment_amenities aa
          WHERE aa.apartment_id = a.id
        ) amenities ON true
        LEFT JOIN LATERAL (
          SELECT AVG(travel_minutes) AS avg_commute
          FROM public.commute_cache cc
          WHERE cc.apartment_id = a.id
        ) commute ON true
        WHERE a.status = 'published'
          AND a.is_available = true
          AND a.monthly_rent_huf BETWEEN $2 AND $3
          AND ($1::text IS NULL OR a.district = $1)
        ORDER BY ABS(a.monthly_rent_huf - $4)
        LIMIT 100
      `,
      [
        factors.location || null,
        priceWindow.min,
        priceWindow.max,
        factors.basePrice,
      ],
    );

    return rows.map((row: any) => ({
      price: row.price,
      rooms: row.rooms,
      amenityCount: row.amenity_count,
      furnished: row.furnished,
      hasElevator: row.has_elevator,
      commute: row.avg_commute,
      size: row.size,
    }));
  }

  private computeComparableStats(comparables: ComparableApartment[], fallback: number) {
    if (!comparables.length) {
      return {
        average: fallback,
        median: fallback,
        percentile25: fallback * 0.9,
        percentile75: fallback * 1.1,
        averageRooms: 0,
        averageAmenities: 0,
        averageCommute: null as number | null,
      };
    }

    const prices = comparables.map((c) => c.price).sort((a, b) => a - b);
    const percentile = (p: number) => {
      const index = Math.min(prices.length - 1, Math.max(0, Math.round((p / 100) * (prices.length - 1))));
      return prices[index];
    };

    const sum = prices.reduce((acc, price) => acc + price, 0);
    const roomsAvg = comparables.reduce((acc, c) => acc + c.rooms, 0) / comparables.length;
    const amenitiesAvg = comparables.reduce((acc, c) => acc + c.amenityCount, 0) / comparables.length;
    const commuteValues = comparables.map((c) => c.commute).filter((value): value is number => typeof value === 'number');

    return {
      average: sum / prices.length,
      median: percentile(50),
      percentile25: percentile(25),
      percentile75: percentile(75),
      averageRooms: roomsAvg,
      averageAmenities: amenitiesAvg,
      averageCommute: commuteValues.length ? commuteValues.reduce((a, b) => a + b, 0) / commuteValues.length : null,
    };
  }

  private calculateAdjustments(
    factors: PricingFactors,
    stats: ReturnType<typeof this.computeComparableStats>,
  ): { totalAdjustment: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};

    const roomDelta = factors.rooms - stats.averageRooms;
    breakdown.rooms = roomDelta * 18_000;

    const amenityDelta = factors.amenities.length - stats.averageAmenities;
    breakdown.amenities = amenityDelta * 4_000;

    const conditionMap: Record<PricingFactors['condition'], number> = {
      excellent: 20_000,
      good: 10_000,
      fair: 0,
      poor: -10_000,
    };
    breakdown.condition = conditionMap[factors.condition];

    if (stats.averageCommute) {
      const commuteDelta = stats.averageCommute - factors.commuteTime;
      breakdown.commute = commuteDelta * 400;
    } else {
      breakdown.commute = 0;
    }

    breakdown.demand = factors.marketDemand * 25_000;
    breakdown.seasonality = factors.seasonality * 12_000;
    breakdown.competition = -Math.max(0, factors.competition) * 3_000;

    const totalAdjustment = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    return { totalAdjustment, breakdown };
  }

  private estimateConfidence(comparableCount: number, factors: PricingFactors): number {
    let confidence = 0.4;

    if (comparableCount >= 30) confidence += 0.3;
    else if (comparableCount >= 10) confidence += 0.2;
    else if (comparableCount >= 5) confidence += 0.1;

    const hasKeyInputs =
      factors.rooms > 0 &&
      factors.amenities.length > 0 &&
      Number.isFinite(factors.commuteTime) &&
      typeof factors.marketDemand === 'number';

    if (hasKeyInputs) {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  async calculateDynamicPrice(
    basePrice: number,
    checkInDate: Date,
    checkOutDate: Date,
    currentBookings: number,
  ): Promise<number> {
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const stayLength = Math.max(
      1,
      Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    let multiplier = 1.0;

    if (daysUntilCheckIn <= 7) {
      multiplier += 0.2;
    } else if (daysUntilCheckIn <= 30) {
      multiplier += 0.1;
    }

    const occupancyRate = Math.min(1, Math.max(0, currentBookings / 30));
    if (occupancyRate > 0.8) {
      multiplier += 0.15;
    } else if (occupancyRate < 0.3) {
      multiplier -= 0.1;
    }

    const isWeekend =
      checkInDate.getDay() === 0 ||
      checkInDate.getDay() === 6 ||
      checkOutDate.getDay() === 0 ||
      checkOutDate.getDay() === 6;
    if (isWeekend) {
      multiplier += 0.1;
    }

    if (stayLength >= 30) {
      multiplier -= 0.1;
    } else if (stayLength >= 7) {
      multiplier -= 0.05;
    }

    return Math.max(30_000, Math.round(basePrice * multiplier));
  }
}

export const pricingService = new PricingService();

