// Commute Intelligence Service for Student Apartments
// Integrates BKK GTFS data and provides commute time calculations
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface CommuteQuery {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  mode: 'transit' | 'walking' | 'bicycling' | 'driving';
  departureTime?: Date;
}

export interface CommuteResult {
  duration: number; // minutes
  distance: number; // meters
  mode: string;
  route?: any; // Detailed route information
  reliability_score?: number; // 0-100
}

export interface University {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

export class CommuteIntelligenceService {
  private _supabase: any = null;
  private gtfsData: any = null;
  private universities: University[] = [];

  private getSupabase(): any {
    if (!this._supabase) {
      this._supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this._supabase;
  }

  constructor() {
    // Lazy initialize - don't access process.env at module load time
  }

  private async ensureInitialized() {
    if (!this.gtfsData) {
      await this.loadGTFSData();
    }
    if (this.universities.length === 0) {
      await this.loadUniversities();
    }
  }

  /**
   * Load BKK GTFS data from local files
   */
  private async loadGTFSData() {
    try {
      // In production, this would download fresh GTFS data from BKK
      // For now, we'll assume GTFS files are stored locally
      const gtfsPath = join(process.cwd(), 'data', 'gtfs');

      if (existsSync(gtfsPath)) {
        // Load stops, routes, trips, stop_times, etc.
        this.gtfsData = {
          stops: this.parseCSV(join(gtfsPath, 'stops.txt')),
          routes: this.parseCSV(join(gtfsPath, 'routes.txt')),
          trips: this.parseCSV(join(gtfsPath, 'trips.txt')),
          stopTimes: this.parseCSV(join(gtfsPath, 'stop_times.txt')),
          calendar: this.parseCSV(join(gtfsPath, 'calendar.txt')),
        };
        console.log('GTFS data loaded successfully');
      } else {
        console.warn('GTFS data not found, using fallback commute calculations');
      }
    } catch (error) {
      console.error('Failed to load GTFS data:', error);
    }
  }

  /**
   * Load university data
   */
  private async loadUniversities() {
    try {
      // Load universities from database
      const { data, error } = await this.getSupabase()
        .from('universities')
        .select('*');

      if (!error && data) {
        this.universities = data;
      }
    } catch (error) {
      console.error('Failed to load universities:', error);
    }
  }

  /**
   * Parse CSV file
   */
  private parseCSV(filePath: string): any[] {
    if (!existsSync(filePath)) return [];

    const csvData = readFileSync(filePath, 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    return rows;
  }

  /**
   * Calculate commute time between two points
   */
  async calculateCommute(query: CommuteQuery): Promise<CommuteResult> {
    const { fromLat, fromLng, toLat, toLng, mode, departureTime } = query;

    try {
      // For transit mode, use GTFS data if available
      if (mode === 'transit' && this.gtfsData) {
        return this.calculateTransitCommute(fromLat, fromLng, toLat, toLng, departureTime);
      }

      // Fallback to Google Maps API or similar service
      return this.calculateSimpleCommute(fromLat, fromLng, toLat, toLng, mode);

    } catch (error) {
      console.error('Commute calculation error:', error);
      // Return a reasonable fallback
      return {
        duration: 30, // 30 minutes fallback
        distance: 5000, // 5km fallback
        mode,
        reliability_score: 50,
      };
    }
  }

  /**
   * Calculate transit commute using GTFS data
   */
  private async calculateTransitCommute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    departureTime?: Date
  ): Promise<CommuteResult> {
    // Find nearest stops
    const fromStop = this.findNearestStop(fromLat, fromLng);
    const toStop = this.findNearestStop(toLat, toLng);

    if (!fromStop || !toStop) {
      throw new Error('Could not find nearby transit stops');
    }

    // Calculate walking time to/from stops (assume 5 km/h walking speed)
    const walkSpeedMps = 5000 / 3600; // 5 km/h in m/s
    const walkToStopDistance = this.calculateDistance(fromLat, fromLng, fromStop.lat, fromStop.lon);
    const walkFromStopDistance = this.calculateDistance(toStop.lat, toStop.lon, toLat, toLng);

    const walkToStopTime = walkToStopDistance / walkSpeedMps / 60; // minutes
    const walkFromStopTime = walkFromStopDistance / walkSpeedMps / 60; // minutes

    // Find transit routes between stops
    const transitResult = await this.findTransitRoute(fromStop, toStop, departureTime);

    if (!transitResult) {
      throw new Error('No transit route found');
    }

    return {
      duration: walkToStopTime + transitResult.duration + walkFromStopTime,
      distance: walkToStopDistance + transitResult.distance + walkFromStopDistance,
      mode: 'transit',
      route: transitResult.route,
      reliability_score: transitResult.reliability_score,
    };
  }

  /**
   * Find nearest transit stop
   */
  private findNearestStop(lat: number, lng: number): any {
    if (!this.gtfsData?.stops) return null;

    let nearestStop: any = null;
    let minDistance = Infinity;

    for (const stop of this.gtfsData.stops) {
      const distance = this.calculateDistance(lat, lng, parseFloat(stop.stop_lat), parseFloat(stop.stop_lon));
      if (distance < minDistance && distance < 1000) { // Within 1km
        minDistance = distance;
        nearestStop = {
          id: stop.stop_id,
          name: stop.stop_name,
          lat: parseFloat(stop.stop_lat),
          lon: parseFloat(stop.stop_lon),
        };
      }
    }

    return nearestStop;
  }

  /**
   * Find transit route between two stops
   */
  private async findTransitRoute(fromStop: any, toStop: any, departureTime?: Date): Promise<any> {
    // This is a simplified implementation
    // In production, this would use proper transit routing algorithms

    // For now, return a mock result
    const baseDuration = 25; // minutes
    const variability = Math.random() * 10 - 5; // ±5 minutes
    const duration = Math.max(5, baseDuration + variability);

    return {
      duration,
      distance: 8000, // 8km average
      route: {
        from: fromStop.name,
        to: toStop.name,
        transfers: Math.floor(Math.random() * 2),
        line: 'Mock Transit Line',
      },
      reliability_score: Math.floor(70 + Math.random() * 25), // 70-95%
    };
  }

  /**
   * Simple commute calculation (fallback)
   */
  private async calculateSimpleCommute(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    mode: string
  ): Promise<CommuteResult> {
    const distance = this.calculateDistance(fromLat, fromLng, toLat, toLng);

    // Speed factors (m/s)
    const speeds = {
      walking: 5000 / 3600, // 5 km/h
      bicycling: 15000 / 3600, // 15 km/h
      driving: 40000 / 3600, // 40 km/h
      transit: 25000 / 3600, // 25 km/h average
    };

    const speed = speeds[mode as keyof typeof speeds] || speeds.walking;
    const duration = (distance / speed) / 60; // minutes

    return {
      duration: Math.round(duration),
      distance: Math.round(distance),
      mode,
      reliability_score: mode === 'walking' || mode === 'bicycling' ? 95 : 75,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Populate commute cache for all apartments and universities
   */
  async populateCommuteCache(): Promise<void> {
    try {
      console.log('Starting commute cache population...');

      // Get all apartments
      const { data: apartments, error: aptError } = await this.getSupabase()
        .from('apartments')
        .select('id, latitude, longitude')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (aptError) throw aptError;

      // Get all universities
      const universities = await this.getUniversities();

      const cacheEntries: any[] = [];
      let processed = 0;

      for (const apartment of apartments || []) {
        for (const university of universities) {
          try {
            // Calculate commute for each mode
            const modes: Array<'transit' | 'walking' | 'bicycling' | 'driving'> =
              ['transit', 'walking', 'bicycling', 'driving'];

            for (const mode of modes) {
              const result = await this.calculateCommute({
                fromLat: apartment.latitude,
                fromLng: apartment.longitude,
                toLat: university.latitude,
                toLng: university.longitude,
                mode,
              });

              cacheEntries.push({
                apartment_id: apartment.id,
                university_id: university.id,
                mode,
                travel_minutes: Math.round(result.duration),
                distance_meters: Math.round(result.distance),
                reliability_score: result.reliability_score || 75,
                last_updated: new Date().toISOString(),
              });
            }

            processed++;
            if (processed % 100 === 0) {
              console.log(`Processed ${processed} apartments...`);
            }

          } catch (error) {
            console.warn(`Failed to calculate commute for apartment ${apartment.id} to ${university.name}:`, error);
          }
        }
      }

      // Batch insert/update cache entries
      const batchSize = 1000;
      for (let i = 0; i < cacheEntries.length; i += batchSize) {
        const batch = cacheEntries.slice(i, i + batchSize);

        const { error: insertError } = await this.getSupabase()
          .from('commute_cache')
          .upsert(batch, {
            onConflict: 'apartment_id,university_id,mode',
          });

        if (insertError) {
          console.error('Batch insert error:', insertError);
        }
      }

      console.log(`Commute cache populated with ${cacheEntries.length} entries`);

    } catch (error) {
      console.error('Commute cache population error:', error);
      throw error;
    }
  }

  /**
   * Get commute time from cache
   */
  async getCachedCommute(
    apartmentId: string,
    universityId: string,
    mode: string = 'transit'
  ): Promise<CommuteResult | null> {
    try {
      const { data, error } = await this.getSupabase()
        .from('commute_cache')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('university_id', universityId)
        .eq('mode', mode)
        .single();

      if (error || !data) return null;

      return {
        duration: data.travel_minutes,
        distance: data.distance_meters,
        mode: data.mode,
        reliability_score: data.reliability_score,
      };

    } catch (error) {
      console.error('Cache lookup error:', error);
      return null;
    }
  }

  /**
   * Get all universities
   */
  async getUniversities(): Promise<University[]> {
    if (this.universities.length === 0) {
      await this.loadUniversities();
    }
    return this.universities;
  }

  /**
   * Update commute cache for a specific apartment
   */
  async updateApartmentCommuteCache(apartmentId: string): Promise<void> {
    try {
      const { data: apartment, error } = await this.getSupabase()
        .from('apartments')
        .select('latitude, longitude')
        .eq('id', apartmentId)
        .single();

      if (error || !apartment?.latitude || !apartment?.longitude) {
        throw new Error('Apartment location not found');
      }

      const universities = await this.getUniversities();
      const cacheEntries: any[] = [];

      for (const university of universities) {
        const modes: Array<'transit' | 'walking' | 'bicycling' | 'driving'> =
          ['transit', 'walking', 'bicycling', 'driving'];

        for (const mode of modes) {
          const result = await this.calculateCommute({
            fromLat: apartment.latitude,
            fromLng: apartment.longitude,
            toLat: university.latitude,
            toLng: university.longitude,
            mode,
          });

          cacheEntries.push({
            apartment_id: apartmentId,
            university_id: university.id,
            mode,
            travel_minutes: Math.round(result.duration),
            distance_meters: Math.round(result.distance),
            reliability_score: result.reliability_score || 75,
            last_updated: new Date().toISOString(),
          });
        }
      }

      // Upsert cache entries
      const { error: upsertError } = await this.getSupabase()
        .from('commute_cache')
        .upsert(cacheEntries, {
          onConflict: 'apartment_id,university_id,mode',
        });

      if (upsertError) throw upsertError;

    } catch (error) {
      console.error('Update apartment commute cache error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const commuteIntelligenceService = new CommuteIntelligenceService();