import { runQuery } from '@/lib/db/pool';

export interface Location {
  lat: number;
  lng: number;
}

export interface University {
  id: string;
  name: string;
  location: Location;
  campus: string;
}

export interface CommuteResult {
  apartmentId: string;
  universityId: string;
  travelTime: number; // minutes
  distance: number; // meters
  mode: 'walking' | 'bicycling' | 'transit' | 'driving';
  route?: {
    steps: string[];
    transfers: number;
    lines: string[];
    polyline?: string;
  };
  realTime?: boolean;
}

export interface GTFSStop {
  id: string;
  name: string;
  location: Location;
  routes: string[];
}

export interface GTFSTrip {
  id: string;
  routeId: string;
  headsign: string;
  stops: GTFSStop[];
  schedule: Array<{ stopId: string; arrival: string; departure: string }>;
  transfers?: number;
}

export interface CommuteCacheEntry {
  key: string;
  result: CommuteResult;
  expiresAt: Date;
}

type TravelMode = 'walking' | 'bicycling' | 'transit' | 'driving';

const FALLBACK_UNIVERSITIES: University[] = [
  {
    id: 'elte',
    name: 'Eotvos Lorand University',
    campus: 'Central Campus',
    location: { lat: 47.4816, lng: 19.0585 },
  },
  {
    id: 'bme',
    name: 'Budapest University of Technology and Economics',
    campus: 'Danube Campus',
    location: { lat: 47.4814, lng: 19.0605 },
  },
  {
    id: 'corvinus',
    name: 'Corvinus University of Budapest',
    campus: 'River Campus',
    location: { lat: 47.486, lng: 19.0584 },
  },
];

const TRANSIT_STOP_RADIUS_METERS = 1_200;

export class CommuteService {
  private universities: University[] = [];
  private transitStops: GTFSStop[] = [];
  private transitStopMap: Map<string, GTFSStop> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000;
  private readonly cache = new Map<string, CommuteCacheEntry>();
  private readonly MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

  constructor() {
    void this.bootstrap();
  }

  private async bootstrap() {
    await Promise.allSettled([this.bootstrapUniversities(), this.bootstrapTransitStops()]);
  }

  async calculateCommute(
    apartmentLocation: Location,
    universityId: string,
    mode: TravelMode = 'transit',
    apartmentId?: string,
  ): Promise<CommuteResult | null> {
    await this.ensureUniversities();
    const university = this.universities.find((u) => u.id === universityId);
    if (!university) {
      throw new Error(`University ${universityId} not found`);
    }

    const cacheKey = this.generateCacheKey(apartmentLocation, universityId, mode);
    const cached = await this.getCachedResult(cacheKey, apartmentId, universityId, mode);
    if (cached) {
      return cached.result;
    }

    const result = await this.fetchCommuteTime(apartmentLocation, university.location, mode);
    if (!result) {
      return null;
    }

    result.apartmentId = apartmentId ?? result.apartmentId;
    result.universityId = universityId;
    this.setCachedResult(cacheKey, result);
    if (apartmentId) {
      await this.persistCache(apartmentId, universityId, mode, result);
    }

    return result;
  }

  async calculateAllCommutes(
    apartmentLocation: Location,
    apartmentId: string,
  ): Promise<CommuteResult[]> {
    await this.ensureUniversities();
    const results: CommuteResult[] = [];

    for (const university of this.universities) {
      for (const mode of ['transit', 'walking', 'bicycling'] as TravelMode[]) {
        const result = await this.calculateCommute(apartmentLocation, university.id, mode, apartmentId);
        if (result) {
          results.push(result);
          break;
        }
      }
    }

    return results;
  }

  async batchCalculateCommutes(
    apartments: Array<{ id: string; location: Location }>,
  ): Promise<Map<string, CommuteResult[]>> {
    await this.ensureUniversities();
    const results = new Map<string, CommuteResult[]>();

    for (const apartment of apartments) {
      const commutes = await this.calculateAllCommutes(apartment.location, apartment.id);
      results.set(apartment.id, commutes);
    }

    return results;
  }

  private generateCacheKey(location: Location, universityId: string, mode: TravelMode): string {
    return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}-${universityId}-${mode}`;
  }

  private async getCachedResult(
    key: string,
    apartmentId: string | undefined,
    universityId: string,
    mode: TravelMode,
  ): Promise<CommuteCacheEntry | null> {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > new Date()) {
      return entry;
    }
    if (entry) {
      this.cache.delete(key);
    }

    if (!apartmentId) {
      return null;
    }

    const { rows } = await runQuery(
      `SELECT apartment_id, university_id, mode, travel_minutes, distance_meters, updated_at
       FROM public.commute_cache
       WHERE apartment_id = $1 AND university_id = $2 AND mode = $3
         AND updated_at > now() - interval '24 hours'`,
      [apartmentId, universityId, mode],
    );

    if (!rows.length) {
      return null;
    }

    const row = rows[0];
    const result: CommuteResult = {
      apartmentId: row.apartment_id,
      universityId: row.university_id,
      travelTime: row.travel_minutes,
      distance: row.distance_meters,
      mode: row.mode,
    };

    const cacheEntry: CommuteCacheEntry = {
      key,
      result,
      expiresAt: new Date(new Date(row.updated_at).getTime() + this.CACHE_TTL),
    };
    this.cache.set(key, cacheEntry);
    return cacheEntry;
  }

  private setCachedResult(key: string, result: CommuteResult) {
    this.cache.set(key, {
      key,
      result,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
    });
  }

  private async persistCache(
    apartmentId: string,
    universityId: string,
    mode: TravelMode,
    result: CommuteResult,
  ) {
    await runQuery(
      `INSERT INTO public.commute_cache (apartment_id, university_id, mode, travel_minutes, distance_meters, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (apartment_id, university_id, mode)
       DO UPDATE SET travel_minutes = EXCLUDED.travel_minutes,
                     distance_meters = EXCLUDED.distance_meters,
                     updated_at = now()`,
      [apartmentId, universityId, mode, result.travelTime, result.distance],
    );
  }

  private async fetchCommuteTime(
    origin: Location,
    destination: Location,
    mode: TravelMode,
  ): Promise<CommuteResult | null> {
    try {
      if (mode !== 'transit' && this.MAPBOX_ACCESS_TOKEN) {
        const mapboxResult = await this.fetchMapboxCommute(origin, destination, mode);
        if (mapboxResult) {
          return mapboxResult;
        }
      }

      if (mode === 'transit') {
        const transitResult = await this.fetchGTFSCommute(origin, destination);
        if (transitResult) {
          return transitResult;
        }
      }
    } catch (error) {
      console.warn('Commute calculation error, falling back', error);
    }

    return this.fallbackCommuteCalculation(origin, destination, mode);
  }

  private async fetchMapboxCommute(
    origin: Location,
    destination: Location,
    mode: TravelMode,
  ): Promise<CommuteResult | null> {
    try {
      const profile = mode === 'bicycling' ? 'cycling' : mode;
      const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${this.MAPBOX_ACCESS_TOKEN}&geometries=geojson`;
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }

      const data: any = await response.json();
      if (!data.routes?.length) {
        return null;
      }

      const bestRoute = data.routes[0];
      return {
        apartmentId: '',
        universityId: '',
        travelTime: Math.round(bestRoute.duration / 60),
        distance: Math.round(bestRoute.distance),
        mode,
        route: {
          steps: bestRoute.legs?.[0]?.steps?.map((step: any) => step.maneuver.instruction) ?? [],
          transfers: 0,
          lines: [],
          polyline: this.encodePolyline(bestRoute.geometry.coordinates),
        },
        realTime: false,
      };
    } catch (error) {
      console.warn('Mapbox commute failed', error);
      return null;
    }
  }

  private async fetchGTFSCommute(origin: Location, destination: Location): Promise<CommuteResult | null> {
    const originStop = await this.findNearestStop(origin);
    const destStop = await this.findNearestStop(destination);
    if (!originStop || !destStop) {
      return null;
    }

    const trips = await this.findConnectingTrips(originStop.id, destStop.id);
    if (!trips.length) {
      return null;
    }

    const bestTrip = trips[0];
    const distance = this.calculateHaversineDistance(origin, destination);
    const travelTime = this.estimateTransitMinutes(distance, bestTrip.transfers ?? 0);

    return {
      apartmentId: '',
      universityId: '',
      travelTime,
      distance: Math.round(distance),
      mode: 'transit',
      route: {
        steps: [
          `Walk to ${originStop.name}`,
          bestTrip.transfers && bestTrip.transfers > 0
            ? `Take ${bestTrip.routeId} with ${bestTrip.transfers} transfer`
            : `Take ${bestTrip.routeId}`,
          `Walk from ${destStop.name}`,
        ],
        transfers: bestTrip.transfers ?? 0,
        lines: [bestTrip.routeId],
      },
      realTime: true,
    };
  }

  private async findNearestStop(location: Location): Promise<GTFSStop | null> {
    await this.ensureTransitStops();
    if (!this.transitStops.length) {
      return null;
    }

    let nearest: GTFSStop | null = null;
    let minDistance = Infinity;

    for (const stop of this.transitStops) {
      const distance = this.calculateHaversineDistance(location, stop.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    }

    return minDistance <= TRANSIT_STOP_RADIUS_METERS ? nearest : null;
  }

  private async findConnectingTrips(originStopId: string, destStopId: string): Promise<GTFSTrip[]> {
    await this.ensureTransitStops();
    const origin = this.transitStopMap.get(originStopId);
    const destination = this.transitStopMap.get(destStopId);
    if (!origin || !destination) {
      return [];
    }

    const sharedRoutes = origin.routes.filter((route) => destination.routes.includes(route));
    if (sharedRoutes.length) {
      const route = sharedRoutes[0];
      return [
        {
          id: `${originStopId}-${destStopId}-${route}`,
          routeId: route,
          headsign: destination.name,
          stops: [],
          schedule: [],
          transfers: 0,
        },
      ];
    }

    let bestAlternative: { trip: GTFSTrip; score: number } | null = null;

    for (const candidate of this.transitStops) {
      if (candidate.id === originStopId || candidate.id === destStopId) {
        continue;
      }

      const firstLegRoute = origin.routes.find((route) => candidate.routes.includes(route));
      const secondLegRoute = destination.routes.find((route) => candidate.routes.includes(route));

      if (firstLegRoute && secondLegRoute) {
        const trip: GTFSTrip = {
          id: `${originStopId}-${candidate.id}-${destStopId}`,
          routeId: `${firstLegRoute}->${secondLegRoute}`,
          headsign: destination.name,
          stops: [],
          schedule: [],
          transfers: 1,
        };

        // Prefer intermediate stops that minimise total detour distance.
        const score =
          this.calculateHaversineDistance(origin.location, candidate.location) +
          this.calculateHaversineDistance(candidate.location, destination.location);

        if (!bestAlternative || score < bestAlternative.score) {
          bestAlternative = { trip, score };
        }
      }
    }

    return bestAlternative ? [bestAlternative.trip] : [];
  }

  private estimateTransitMinutes(distanceMeters: number, transfers: number): number {
    const base = distanceMeters / 350; // ≈21 km/h average speed
    const transferPenalty = transfers * 5;
    return Math.max(12, Math.round(base + transferPenalty));
  }

  private fallbackCommuteCalculation(origin: Location, destination: Location, mode: TravelMode): CommuteResult {
    const distance = this.calculateHaversineDistance(origin, destination);
    let travelMinutes: number;

    switch (mode) {
      case 'walking':
        travelMinutes = (distance / 5_000) * 60;
        break;
      case 'bicycling':
        travelMinutes = (distance / 15_000) * 60;
        break;
      case 'driving':
        travelMinutes = (distance / 30_000) * 60;
        break;
      case 'transit':
      default:
        travelMinutes = this.estimateTransitMinutes(distance, 0);
        break;
    }

    return {
      apartmentId: '',
      universityId: '',
      travelTime: Math.max(5, Math.round(travelMinutes)),
      distance: Math.round(distance),
      mode,
    };
  }

  private encodePolyline(coords: number[][]): string {
    return coords.map((coord) => `${coord[1]},${coord[0]}`).join(';');
  }

  private calculateHaversineDistance(a: Location, b: Location): number {
    const R = 6_371_000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);

    const value =
      sinLat * sinLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;

    return R * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  private async bootstrapUniversities() {
    try {
      const { rows } = await runQuery(
        `SELECT id, name, campus, latitude, longitude FROM public.universities ORDER BY name`,
      );
      if (rows.length) {
        this.universities = rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          campus: row.campus,
          location: { lat: Number(row.latitude), lng: Number(row.longitude) },
        }));
        return;
      }
    } catch (error) {
      console.warn('Unable to load universities from database, using fallback data', error);
    }
    this.universities = FALLBACK_UNIVERSITIES;
  }

  private async ensureUniversities() {
    if (!this.universities.length) {
      await this.bootstrapUniversities();
    }
  }

  private async bootstrapTransitStops() {
    try {
      const { rows } = await runQuery(
        `SELECT id, name, latitude, longitude, routes FROM public.transit_stops ORDER BY name`,
      );
      if (rows.length) {
        this.transitStops = rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          location: { lat: Number(row.latitude), lng: Number(row.longitude) },
          routes: Array.isArray(row.routes) ? row.routes : [],
        }));
        this.transitStopMap = new Map(this.transitStops.map((stop) => [stop.id, stop]));
      }
    } catch (error) {
      console.warn('Unable to load transit stops from database', error);
    }
  }

  private async ensureTransitStops() {
    if (!this.transitStops.length) {
      await this.bootstrapTransitStops();
    }
  }

  /**
   * Get all available universities
   */
  getUniversities(): University[] {
    return this.universities.length ? this.universities : FALLBACK_UNIVERSITIES;
  }
}

export const commuteService = new CommuteService();
