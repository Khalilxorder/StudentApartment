// Commute & Pricing Intelligence Service
// Handles GTFS data, commute calculations, and pricing predictions

import { createClient, createServiceClient } from '@/utils/supabaseClient';

export interface CommuteRoute {
  startPoint: { lat: number; lng: number };
  endPoint: { lat: number; lng: number };
  transportMode: 'transit' | 'walking' | 'cycling' | 'driving';
  duration: number; // in minutes
  distance: number; // in km
  frequency?: number; // departures per hour for transit
  cost?: number; // in currency
}

export interface CommuteAnalysis {
  apartmentId: string;
  destinationName: string;
  routes: CommuteRoute[];
  bestRoute: CommuteRoute;
  walkabilityScore: number; // 0-100
  transitScore: number; // 0-100
  overallAccessibility: number; // 0-100
}

export interface PricingPrediction {
  apartmentId: string;
  currentPrice: number;
  predictedPrice: number;
  priceDirection: 'up' | 'down' | 'stable';
  confidence: number; // 0-1
  factors: {
    demandTrend: number;
    seasonality: number;
    marketAverage: number;
    competitorPricing: number;
  };
  recommendedPrice: number;
}

export interface DistrictPricingTrend {
  district: string;
  averagePrice: number;
  priceChange30d: number;
  priceChange90d: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  affordabilityIndex: number; // 0-100, higher = more affordable
}

export class CommuteAndPricingService {
  private gtfsData: Map<string, any> = new Map();
  private pricingCache: Map<string, PricingPrediction> = new Map();

  async calculateCommute(
    apartmentLat: number,
    apartmentLng: number,
    destinationName: string,
    transportMode: 'transit' | 'walking' | 'cycling' | 'driving' = 'transit',
    destinationCoords?: { lat: number; lng: number }
  ): Promise<CommuteAnalysis> {
    try {
      // For demo: use mock data or external API
      // In production: integrate Google Maps Distance Matrix, GTFS data, etc.

      const routes: CommuteRoute[] = [];

      // Transit route (if available)
      if (transportMode === 'transit' || true) {
        routes.push({
          startPoint: { lat: apartmentLat, lng: apartmentLng },
          endPoint: destinationCoords || { lat: 47.4979, lng: 19.0402 }, // Budapest center default
          transportMode: 'transit',
          duration: Math.floor(Math.random() * 30) + 15, // 15-45 min
          distance: Math.floor(Math.random() * 10) + 5, // 5-15 km
          frequency: Math.floor(Math.random() * 6) + 2, // 2-8 per hour
          cost: 430, // Budapest monthly pass
        });
      }

      // Walking route
      if (transportMode === 'walking' || true) {
        routes.push({
          startPoint: { lat: apartmentLat, lng: apartmentLng },
          endPoint: destinationCoords || { lat: 47.4979, lng: 19.0402 },
          transportMode: 'walking',
          duration: Math.floor(Math.random() * 90) + 30, // 30-120 min
          distance: Math.floor(Math.random() * 8) + 3, // 3-11 km
        });
      }

      // Calculate walkability score based on distance/terrain
      const walkabilityScore = Math.max(0, 100 - (routes[1]?.distance || 10) * 8);

      // Calculate transit score
      const transitRoute = routes.find(r => r.transportMode === 'transit');
      const transitScore = transitRoute ? Math.max(0, 100 - (transitRoute.duration - 15) * 2) : 50;

      // Overall accessibility
      const overallAccessibility = (walkabilityScore + transitScore) / 2;

      return {
        apartmentId: `apt-${Math.random().toString(36).substr(2, 9)}`,
        destinationName,
        routes,
        bestRoute: routes.sort((a, b) => a.duration - b.duration)[0],
        walkabilityScore,
        transitScore,
        overallAccessibility,
      };
    } catch (error) {
      console.error('Commute calculation error:', error);
      throw error;
    }
  }

  async predictApartmentPrice(apartmentId: string): Promise<PricingPrediction> {
    try {
      // Check cache first
      if (this.pricingCache.has(apartmentId)) {
        return this.pricingCache.get(apartmentId)!;
      }

      const supabase = createServiceClient();

      // Get current apartment data
      const { data: apartment } = await supabase
        .from('apartments')
        .select('*, profiles:owner_id(created_at)')
        .eq('id', apartmentId)
        .single();

      if (!apartment) {
        throw new Error(`Apartment ${apartmentId} not found`);
      }

      const currentPrice = apartment.price;

      // Get market comparables
      const { data: comparables } = await supabase
        .from('apartments')
        .select('price')
        .eq('district', apartment.district)
        .eq('bedrooms', apartment.bedrooms)
        .gt('price', currentPrice * 0.8)
        .lt('price', currentPrice * 1.2);

      const marketAverage = comparables && comparables.length > 0
        ? comparables.reduce((sum, apt) => sum + apt.price, 0) / comparables.length
        : currentPrice;

      // Calculate pricing factors
      const demandTrend = Math.random() * 0.3 - 0.15; // -15% to +15%
      const seasonality = this.getSeasonalityFactor();
      const marketFactor = (marketAverage - currentPrice) / currentPrice;
      const competitorFactor = -0.05; // Competitive pressure

      // Weighted prediction
      const factors = {
        demandTrend,
        seasonality,
        marketAverage: marketFactor,
        competitorPricing: competitorFactor,
      };

      const priceChange = (demandTrend * 0.3 + seasonality * 0.2 + marketFactor * 0.3 + competitorFactor * 0.2);
      const predictedPrice = currentPrice * (1 + priceChange);
      const confidence = Math.random() * 0.3 + 0.7; // 0.7-1.0

      const prediction: PricingPrediction = {
        apartmentId,
        currentPrice,
        predictedPrice: Math.round(predictedPrice),
        priceDirection: priceChange > 0.05 ? 'up' : priceChange < -0.05 ? 'down' : 'stable',
        confidence,
        factors,
        recommendedPrice: Math.round(predictedPrice * 0.95), // 5% discount for competitiveness
      };

      // Cache the prediction
      this.pricingCache.set(apartmentId, prediction);

      return prediction;
    } catch (error) {
      console.error('Price prediction error:', error);
      throw error;
    }
  }

  private getSeasonalityFactor(): number {
    const month = new Date().getMonth();
    // Higher demand in summer (June-August)
    if (month >= 5 && month <= 7) return 0.15;
    // Lower demand in winter (Dec-Feb)
    if (month === 11 || month === 0 || month === 1) return -0.1;
    // Moderate in spring/fall
    return 0.05;
  }

  async getDistrictPricingTrends(): Promise<DistrictPricingTrend[]> {
    try {
      const supabase = createServiceClient();

      const { data: apartments } = await supabase
        .from('apartments')
        .select('district, price, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!apartments) {
        return [];
      }

      // Group by district
      const districts: Record<string, any[]> = {};
      apartments.forEach(apt => {
        if (!districts[apt.district]) {
          districts[apt.district] = [];
        }
        districts[apt.district].push(apt);
      });

      // Calculate trends for each district
      const trends: DistrictPricingTrend[] = [];
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const [district, apts] of Object.entries(districts)) {
        const currentPrice = apts.filter(a => new Date(a.created_at) >= thirtyDaysAgo)
          .reduce((sum, a) => sum + a.price, 0) / Math.max(1, apts.filter(a => new Date(a.created_at) >= thirtyDaysAgo).length);

        const priceMonth1 = apts.filter(a => {
          const d = new Date(a.created_at);
          return d >= ninetyDaysAgo && d < thirtyDaysAgo;
        }).reduce((sum, a) => sum + a.price, 0) / Math.max(1, apts.filter(a => {
          const d = new Date(a.created_at);
          return d >= ninetyDaysAgo && d < thirtyDaysAgo;
        }).length);

        const priceMonth2 = apts.filter(a => {
          const d = new Date(a.created_at);
          return d < ninetyDaysAgo;
        }).reduce((sum, a) => sum + a.price, 0) / Math.max(1, apts.filter(a => {
          const d = new Date(a.created_at);
          return d < ninetyDaysAgo;
        }).length);

        const priceChange30d = ((currentPrice - priceMonth1) / priceMonth1) * 100;
        const priceChange90d = ((currentPrice - priceMonth2) / priceMonth2) * 100;

        // Affordability index (inverted price: lower price = higher affordability)
        const affordabilityIndex = Math.max(0, 100 - (currentPrice / 5000) * 100); // Normalized to 5000 max

        trends.push({
          district,
          averagePrice: Math.round(currentPrice),
          priceChange30d: Math.round(priceChange30d * 100) / 100,
          priceChange90d: Math.round(priceChange90d * 100) / 100,
          trend: priceChange30d > 2 ? 'increasing' : priceChange30d < -2 ? 'decreasing' : 'stable',
          affordabilityIndex: Math.min(100, Math.max(0, affordabilityIndex)),
        });
      }

      return trends.sort((a, b) => a.averagePrice - b.averagePrice);
    } catch (error) {
      console.error('Failed to get district pricing trends:', error);
      return [];
    }
  }

  async integrateGTFSData(feedUrl: string): Promise<void> {
    try {
      // In production: parse GTFS zip from feedUrl, extract stops, routes, schedules
      // For demo: just log the intention
      console.log(`GTFS data integration for feed: ${feedUrl}`);
      console.log('In production, this would:');
      console.log('1. Download GTFS zip file');
      console.log('2. Parse stops.txt, routes.txt, stop_times.txt');
      console.log('3. Index by geographic coordinates');
      console.log('4. Enable real-time transit accessibility calculations');

      this.gtfsData.set(feedUrl, {
        loadedAt: new Date(),
        status: 'loaded',
      });
    } catch (error) {
      console.error('GTFS integration error:', error);
    }
  }
}

export const commuteAndPricingService = new CommuteAndPricingService();
