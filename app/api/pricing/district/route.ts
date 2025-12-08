import { logger } from '@/lib/dev-logger';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * District Pricing API
 * Returns market pricing data for a specific district
 * Used by PriceValidationHint component for real-time price feedback
 */

interface DistrictPricing {
  district: number;
  bedrooms: number;
  min: number;
  max: number;
  median: number;
  avg: number;
  count: number;
  trend: 'up' | 'down' | 'stable';
}

// Budapest district pricing baselines (HUF/month) - 2024 market data
const DISTRICT_BASE_PRICES: Record<number, { min: number; max: number; median: number }> = {
  1: { min: 180000, max: 450000, median: 280000 },  // Castle District
  2: { min: 200000, max: 500000, median: 320000 },  // Rózsadomb
  3: { min: 140000, max: 350000, median: 220000 },  // Óbuda
  4: { min: 100000, max: 250000, median: 160000 },  // Újpest
  5: { min: 200000, max: 550000, median: 350000 },  // Inner City (Belváros)
  6: { min: 180000, max: 450000, median: 290000 },  // Terézváros
  7: { min: 160000, max: 400000, median: 260000 },  // Jewish Quarter
  8: { min: 120000, max: 300000, median: 190000 },  // Józsefváros
  9: { min: 130000, max: 320000, median: 200000 },  // Ferencváros
  10: { min: 90000, max: 220000, median: 140000 },  // Kőbánya
  11: { min: 150000, max: 380000, median: 240000 },  // Újbuda
  12: { min: 180000, max: 450000, median: 300000 },  // Hegyvidék
  13: { min: 160000, max: 400000, median: 260000 },  // Angyalföld
  14: { min: 130000, max: 300000, median: 200000 },  // Zugló
  15: { min: 90000, max: 200000, median: 130000 },  // Rákospalota
  16: { min: 100000, max: 230000, median: 150000 },  // Árpádföld
  17: { min: 85000, max: 190000, median: 120000 },  // Rákosmente
  18: { min: 95000, max: 210000, median: 140000 },  // Pestszentlőrinc
  19: { min: 100000, max: 240000, median: 160000 },  // Kispest
  20: { min: 90000, max: 200000, median: 130000 },  // Pesterzsébet
  21: { min: 85000, max: 190000, median: 120000 },  // Csepel
  22: { min: 110000, max: 280000, median: 180000 },  // Budafok
  23: { min: 80000, max: 180000, median: 110000 },  // Soroksár
};

// Bedroom multipliers (base is 2BR)
const BEDROOM_MULTIPLIERS: Record<number, number> = {
  0: 0.6,   // Studio
  1: 0.8,   // 1BR
  2: 1.0,   // 2BR (base)
  3: 1.25,  // 3BR
  4: 1.5,   // 4BR
  5: 1.75,  // 5BR+
};

function getBedroomMultiplier(bedrooms: number): number {
  if (bedrooms >= 5) return BEDROOM_MULTIPLIERS[5];
  return BEDROOM_MULTIPLIERS[bedrooms] || 1.0;
}

async function getMarketDataFromDB(district: number, bedrooms: number): Promise<DistrictPricing | null> {
  try {
    const supabase = createClient();
    
    // Get actual listings in this district with similar bedroom count
    const { data: apartments, error } = await supabase
      .from('apartments')
      .select('price_huf, bedrooms')
      .eq('district', district)
      .eq('is_available', true)
      .gte('bedrooms', Math.max(0, bedrooms - 1))
      .lte('bedrooms', bedrooms + 1);

    if (error || !apartments || apartments.length < 3) {
      // Not enough data, use baseline estimates
      return null;
    }

    const prices = apartments.map(a => a.price_huf).filter(p => p > 0).sort((a, b) => a - b);
    
    if (prices.length < 3) return null;

    const min = prices[0];
    const max = prices[prices.length - 1];
    const median = prices[Math.floor(prices.length / 2)];
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    // Determine trend (simplified - would use historical data in production)
    const trend: 'up' | 'down' | 'stable' = 'stable';

    return {
      district,
      bedrooms,
      min,
      max,
      median,
      avg,
      count: prices.length,
      trend,
    };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching market data:');
    return null;
  }
}

function getEstimatedPricing(district: number, bedrooms: number): DistrictPricing {
  const basePrices = DISTRICT_BASE_PRICES[district] || DISTRICT_BASE_PRICES[8]; // Default to District 8
  const multiplier = getBedroomMultiplier(bedrooms);

  return {
    district,
    bedrooms,
    min: Math.round(basePrices.min * multiplier),
    max: Math.round(basePrices.max * multiplier),
    median: Math.round(basePrices.median * multiplier),
    avg: Math.round(basePrices.median * multiplier),
    count: 0, // Indicates estimated data
    trend: 'stable',
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtParam = searchParams.get('district');
    const bedroomsParam = searchParams.get('bedrooms');

    if (!districtParam) {
      return NextResponse.json(
        { error: 'District parameter is required' },
        { status: 400 }
      );
    }

    const district = parseInt(districtParam, 10);
    const bedrooms = bedroomsParam ? parseInt(bedroomsParam, 10) : 2;

    if (isNaN(district) || district < 1 || district > 23) {
      return NextResponse.json(
        { error: 'District must be a number between 1 and 23' },
        { status: 400 }
      );
    }

    // Try to get real market data first
    const marketData = await getMarketDataFromDB(district, bedrooms);
    
    // Fall back to estimated pricing if not enough real data
    const pricing = marketData || getEstimatedPricing(district, bedrooms);

    return NextResponse.json(pricing);
  } catch (error) {
    logger.error({ err: error }, 'District pricing API error:');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
