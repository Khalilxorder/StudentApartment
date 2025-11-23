/**
 * Phase 6: Commute Intelligence Service
 * Extended implementation with real routing calculations
 */

import { createClient } from '@supabase/supabase-js';

export interface CommuteQuery {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: 'transit' | 'walking' | 'bicycling' | 'driving';
  departureTime?: Date;
}

export interface CommuteResult {
  duration_minutes: number;
  distance_meters: number;
  mode: string;
  route?: any;
  reliability_score: number;
  fare_huf?: number;
}

export interface University {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

export class CommuteIntelligenceService {
  private supabase: any;
  private commuteCacheMinutes = 1440; // 24 hours

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Calculate commute time between two points
   */
  async calculateCommute(query: CommuteQuery): Promise<CommuteResult> {
    // Check cache first
    const cached = await this.getCommuteCached(query);
    if (cached) {
      return cached;
    }

    let result: CommuteResult;

    switch (query.mode) {
      case 'walking':
        result = await this.calculateWalkingCommute(query);
        break;
      case 'bicycling':
        result = await this.calculateBicyclingCommute(query);
        break;
      case 'driving':
        result = await this.calculateDrivingCommute(query);
        break;
      case 'transit':
      default:
        result = await this.calculateTransitCommute(query);
        break;
    }

    // Cache the result
    await this.cacheCommuteResult(query, result);

    return result;
  }

  /**
   * Get route from GTFS data (BKK Budapest transit)
   */
  private async getGTFSRoute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ): Promise<CommuteResult | null> {
    try {
      // Query pre-processed GTFS data from Supabase
      const { data, error } = await this.supabase
        .from('gtfs_routes')
        .select('*')
        .filter('from_lat', 'gte', fromLat - 0.05)
        .filter('from_lat', 'lte', fromLat + 0.05)
        .filter('from_lng', 'gte', fromLng - 0.05)
        .filter('from_lng', 'lte', fromLng + 0.05)
        .filter('to_lat', 'gte', toLat - 0.05)
        .filter('to_lat', 'lte', toLat + 0.05)
        .filter('to_lng', 'gte', toLng - 0.05)
        .filter('to_lng', 'lte', toLng + 0.05)
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      const route = data[0];
      return {
        duration_minutes: route.duration_minutes,
        distance_meters: route.distance_meters,
        mode: 'transit',
        route: route.route_details,
        reliability_score: route.reliability_score || 85,
        fare_huf: 350, // Standard BKK fare
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate transit commute using BKK GTFS data
   */
  private async calculateTransitCommute(query: CommuteQuery): Promise<CommuteResult> {
    // Try to use real GTFS data from BKK (Budapest Public Transport)
    // Falls back to improved heuristics if API unavailable
    try {
      // Check if we have cached GTFS data
      const cachedRoute = await this.getGTFSRoute(
        query.fromLat,
        query.fromLng,
        query.toLat,
        query.toLng,
      );

      if (cachedRoute) {
        return cachedRoute;
      }
    } catch (error) {
      console.warn('GTFS route lookup failed, using heuristics:', error);
    }

    // Fallback: Improved heuristic calculation
    const distanceMeters = this.haversineDistance(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng
    );

    // Improved estimation based on Budapest transit patterns
    // Average speed includes transfers, waiting, walking (~20-23 km/h effective)
    const effectiveSpeed = 21; // km/h
    const estimatedMinutes = Math.ceil((distanceMeters / 1000) / effectiveSpeed * 60);

    // Add realistic waiting/walking time (6-12 minutes depending on distance)
    const waitingTime = Math.min(12, Math.max(6, Math.ceil(distanceMeters / 2000)));
    const totalMinutes = estimatedMinutes + waitingTime;

    // Reliability score based on distance and time of day
    const reliabilityScore = this.calculateReliabilityScore(
      distanceMeters,
      query.departureTime
    );

    // Estimate fare: HUF 350 for most trips in Budapest
    const fareHuf = distanceMeters > 35000 ? 700 : 350;

    return {
      duration_minutes: totalMinutes,
      distance_meters: distanceMeters,
      mode: 'transit',
      reliability_score: reliabilityScore,
      fare_huf: fareHuf,
    };
  }

  /**
   * Calculate walking commute
   */
  private async calculateWalkingCommute(query: CommuteQuery): Promise<CommuteResult> {
    const distanceMeters = this.haversineDistance(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng
    );

    // Walking speed: ~1.4 m/s (about 5 km/h)
    const walkingSpeedMs = 1.4;
    const durationMinutes = Math.ceil(distanceMeters / walkingSpeedMs / 60);

    return {
      duration_minutes: durationMinutes,
      distance_meters: distanceMeters,
      mode: 'walking',
      reliability_score: 100, // Walking is reliable
    };
  }

  /**
   * Calculate bicycling commute
   */
  private async calculateBicyclingCommute(query: CommuteQuery): Promise<CommuteResult> {
    const distanceMeters = this.haversineDistance(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng
    );

    // Cycling speed: ~6 m/s (about 21.6 km/h, reasonable for Budapest)
    const cyclingSpeedMs = 6;
    const durationMinutes = Math.ceil(distanceMeters / cyclingSpeedMs / 60);

    return {
      duration_minutes: durationMinutes,
      distance_meters: distanceMeters,
      mode: 'bicycling',
      reliability_score: 90,
    };
  }

  /**
   * Calculate driving commute
   */
  private async calculateDrivingCommute(query: CommuteQuery): Promise<CommuteResult> {
    const distanceMeters = this.haversineDistance(
      query.fromLat,
      query.fromLng,
      query.toLat,
      query.toLng
    );

    // Driving speed: ~15 m/s (54 km/h average in city)
    const drivingSpeedMs = 15;
    const durationMinutes = Math.ceil(distanceMeters / drivingSpeedMs / 60);

    // Rush hour factor
    const isRushHour = this.isRushHour(query.departureTime);
    const adjustedDuration = isRushHour
      ? Math.ceil(durationMinutes * 1.5)
      : durationMinutes;

    return {
      duration_minutes: adjustedDuration,
      distance_meters: distanceMeters,
      mode: 'driving',
      reliability_score: isRushHour ? 60 : 85,
    };
  }

  /**
   * Get commute for apartment to university
   */
  async getCommuteToUniversity(
    apartmentId: string,
    universityId: string,
    mode: string = 'transit'
  ): Promise<CommuteResult | null> {
    try {
      const { data: apartment } = await this.supabase
        .from('apartments')
        .select('latitude, longitude')
        .eq('id', apartmentId)
        .single();

      const { data: university } = await this.supabase
        .from('universities')
        .select('latitude, longitude')
        .eq('id', universityId)
        .single();

      if (!apartment || !university) {
        return null;
      }

      return this.calculateCommute({
        fromLat: apartment.latitude,
        fromLng: apartment.longitude,
        toLat: university.latitude,
        toLng: university.longitude,
        mode: mode as any,
      });
    } catch (error) {
      console.error('Error calculating commute:', error);
      return null;
    }
  }

  /**
   * Get commute matrix for multiple apartments
   */
  async getCommuteMatrix(
    apartmentIds: string[],
    universityIds: string[],
    mode: string = 'transit'
  ): Promise<Record<string, Record<string, CommuteResult>>> {
    const matrix: Record<string, Record<string, CommuteResult>> = {};

    for (const apartmentId of apartmentIds) {
      matrix[apartmentId] = {};

      for (const universityId of universityIds) {
        const result = await this.getCommuteToUniversity(
          apartmentId,
          universityId,
          mode
        );
        if (result) {
          matrix[apartmentId][universityId] = result;
        }
      }
    }

    return matrix;
  }

  /**
   * Get all universities
   */
  async getUniversities(): Promise<University[]> {
    try {
      const { data } = await this.supabase
        .from('universities')
        .select('id, name, latitude, longitude, address')
        .order('name');

      return data || [];
    } catch (error) {
      console.error('Error fetching universities:', error);
      return [];
    }
  }

  /**
   * Private helper: Cache retrieval
   */
  private async getCommuteCached(query: CommuteQuery): Promise<CommuteResult | null> {
    try {
      const { data } = await this.supabase
        .from('commute_cache')
        .select('*')
        .eq('from_lat', query.fromLat)
        .eq('from_lng', query.fromLng)
        .eq('to_lat', query.toLat)
        .eq('to_lng', query.toLng)
        .eq('mode', query.mode)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (data) {
        return {
          duration_minutes: data.duration_minutes,
          distance_meters: data.distance_meters,
          mode: data.mode,
          reliability_score: data.reliability_score,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Private helper: Cache storage
   */
  private async cacheCommuteResult(
    query: CommuteQuery,
    result: CommuteResult
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.supabase.from('commute_cache').insert({
      from_lat: query.fromLat,
      from_lng: query.fromLng,
      to_lat: query.toLat,
      to_lng: query.toLng,
      mode: query.mode,
      duration_minutes: result.duration_minutes,
      distance_meters: result.distance_meters,
      reliability_score: result.reliability_score,
      expires_at: expiresAt.toISOString(),
    });
  }

  /**
   * Haversine formula: Calculate distance between two coordinates
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLng / 2) *
        Math.sin(deltaLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate reliability score based on distance and time
   */
  private calculateReliabilityScore(
    distanceMeters: number,
    departureTime?: Date
  ): number {
    let score = 85;

    // Longer distances are less reliable
    if (distanceMeters > 50000) score -= 20;
    else if (distanceMeters > 30000) score -= 10;

    // Rush hour reduces reliability
    if (departureTime && this.isRushHour(departureTime)) {
      score -= 15;
    }

    return Math.max(30, Math.min(100, score));
  }

  /**
   * Check if time is rush hour (7-9 AM or 4-7 PM weekdays)
   */
  private isRushHour(date?: Date): boolean {
    const time = date ? new Date(date) : new Date();
    const hour = time.getHours();
    const day = time.getDay();

    // Not rush hour on weekends
    if (day === 0 || day === 6) return false;

    // Morning rush: 7-9 AM, Evening rush: 4-7 PM
    return (hour >= 7 && hour < 9) || (hour >= 16 && hour < 19);
  }
}

export const commuteService = new CommuteIntelligenceService();
