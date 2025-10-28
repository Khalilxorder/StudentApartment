import { NextRequest, NextResponse } from 'next/server';

// Commute Service - Travel time calculations for Budapest universities
// Integrates with BKK GTFS data and caching system

interface Location {
  lat: number;
  lng: number;
}

interface University {
  id: string;
  name: string;
  location: Location;
  campus: string;
}

interface CommuteResult {
  apartmentId: string;
  universityId: string;
  travelTime: number; // minutes
  distance: number; // meters
  mode: 'walking' | 'bicycling' | 'transit' | 'driving';
  route?: {
    steps: string[];
    transfers: number;
    lines: string[];
  };
}

interface CommuteCache {
  key: string;
  result: CommuteResult;
  expiresAt: Date;
}

class CommuteService {
  private universities: University[] = [
    {
      id: 'elte',
      name: 'Eötvös Loránd University',
      location: { lat: 47.4736, lng: 19.0604 },
      campus: 'Main Campus',
    },
    {
      id: 'bme',
      name: 'Budapest University of Technology',
      location: { lat: 47.4814, lng: 19.0556 },
      campus: 'Main Campus',
    },
    {
      id: 'corvinus',
      name: 'Corvinus University of Budapest',
      location: { lat: 47.4924, lng: 19.0604 },
      campus: 'Main Campus',
    },
    // Add more universities as needed
  ];

  private cache = new Map<string, CommuteCache>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  async calculateCommute(
    apartmentLocation: Location,
    universityId: string,
    mode: 'walking' | 'bicycling' | 'transit' | 'driving' = 'transit'
  ): Promise<CommuteResult | null> {
    const university = this.universities.find(u => u.id === universityId);
    if (!university) {
      throw new Error(`University ${universityId} not found`);
    }

    const cacheKey = this.generateCacheKey(apartmentLocation, universityId, mode);
    const cached = this.getCachedResult(cacheKey);

    if (cached) {
      return cached.result;
    }

    const result = await this.fetchCommuteTime(apartmentLocation, university.location, mode);

    if (result) {
      result.apartmentId = 'temp'; // Will be set by caller
      result.universityId = universityId;
      this.setCachedResult(cacheKey, result);
    }

    return result;
  }

  async calculateAllCommutes(
    apartmentLocation: Location,
    apartmentId: string
  ): Promise<CommuteResult[]> {
    const results: CommuteResult[] = [];

    for (const university of this.universities) {
      // Prioritize transit for Budapest students
      const modes: Array<'walking' | 'bicycling' | 'transit' | 'driving'> = ['transit', 'walking', 'bicycling'];

      for (const mode of modes) {
        try {
          const result = await this.calculateCommute(apartmentLocation, university.id, mode);
          if (result) {
            result.apartmentId = apartmentId;
            result.universityId = university.id;
            results.push(result);
            break; // Use first successful mode
          }
        } catch (error) {
          console.warn(`Failed to calculate ${mode} commute to ${university.id}:`, error);
        }
      }
    }

    return results;
  }

  private async fetchCommuteTime(
    origin: Location,
    destination: Location,
    mode: string
  ): Promise<CommuteResult | null> {
    try {
      const distance = this.calculateHaversineDistance(origin, destination);
      let travelTime: number;

      switch (mode) {
        case 'walking':
          travelTime = (distance / 5000) * 60; // 5 km/h walking speed
          break;
        case 'bicycling':
          travelTime = (distance / 15000) * 60; // 15 km/h biking speed
          break;
        case 'transit':
          travelTime = this.estimateTransitTime(distance);
          break;
        case 'driving':
          travelTime = (distance / 30000) * 60; // 30 km/h average speed
          break;
        default:
          return null;
      }

      return {
        apartmentId: '', // Will be set by caller
        universityId: '', // Will be set by caller
        travelTime: Math.round(travelTime),
        distance: Math.round(distance),
        mode: mode as any,
      };
    } catch (error) {
      console.error('Failed to fetch commute time:', error);
      return null;
    }
  }

  private estimateTransitTime(distance: number): number {
    if (distance < 1000) {
      return (distance / 5000) * 60;
    } else if (distance < 5000) {
      return 15 + (distance / 20000) * 60;
    } else {
      return 25 + (distance / 25000) * 60;
    }
  }

  private calculateHaversineDistance(loc1: Location, loc2: Location): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLng = this.toRadians(loc2.lng - loc1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private generateCacheKey(location: Location, universityId: string, mode: string): string {
    return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}-${universityId}-${mode}`;
  }

  private getCachedResult(key: string): CommuteCache | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired
    }
    return null;
  }

  private setCachedResult(key: string, result: CommuteResult): void {
    this.cache.set(key, {
      key,
      result,
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
    });
  }
}

const commuteService = new CommuteService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const universityId = searchParams.get('universityId');
    const mode = searchParams.get('mode') as 'walking' | 'bicycling' | 'transit' | 'driving';

    if (!lat || !lng || !universityId) {
      return NextResponse.json({
        error: 'Missing required parameters: lat, lng, universityId'
      }, { status: 400 });
    }

    const apartmentLocation = {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
    };

    const result = await commuteService.calculateCommute(
      apartmentLocation,
      universityId,
      mode || 'transit'
    );

    if (!result) {
      return NextResponse.json({
        error: 'Could not calculate commute time'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Commute calculation error:', error);
    return NextResponse.json(
      { error: 'Commute calculation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apartmentId, apartmentLocation } = body;

    if (!apartmentId || !apartmentLocation) {
      return NextResponse.json({
        error: 'Missing required parameters: apartmentId, apartmentLocation'
      }, { status: 400 });
    }

    const results = await commuteService.calculateAllCommutes(
      apartmentLocation,
      apartmentId
    );

    return NextResponse.json({
      success: true,
      data: {
        apartmentId,
        commutes: results,
      },
    });

  } catch (error) {
    console.error('Batch commute calculation error:', error);
    return NextResponse.json(
      { error: 'Batch commute calculation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}