/**
 * Location Score Service
 * Custom walkability/transit scoring using Google Maps APIs
 * Alternative to WalkScore - uses your existing Google Maps API key
 */

interface LocationScores {
  walkability: number;      // 0-100
  transit: number;          // 0-100
  amenities: number;        // 0-100
  overall: number;          // 0-100
  nearbyPlaces: NearbyPlace[];
  transitStops: TransitStop[];
  description: string;
}

interface NearbyPlace {
  name: string;
  type: string;
  distance: number;  // meters
  walkTime: number;  // minutes
}

interface TransitStop {
  name: string;
  type: 'bus' | 'subway' | 'train' | 'tram';
  distance: number;
}

// Place types that contribute to walkability
const WALKABILITY_PLACES = [
  'supermarket',
  'grocery_or_supermarket', 
  'pharmacy',
  'restaurant',
  'cafe',
  'bakery',
  'bank',
  'gym',
  'park',
  'shopping_mall',
  'convenience_store'
];

const TRANSIT_TYPES = ['bus_station', 'subway_station', 'train_station', 'transit_station'];

export class LocationScoreService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    // Try multiple possible env var names for Google Maps API key
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY 
      || process.env.NEXT_PUBLIC_MAPS_API_KEY 
      || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
      || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured - location scores will use fallback');
    }
  }

  /**
   * Calculate comprehensive location scores for coordinates
   */
  async getLocationScores(
    lat: number,
    lng: number,
    radius: number = 1000 // 1km default
  ): Promise<LocationScores> {
    if (!this.apiKey) {
      return this.getFallbackScores();
    }

    try {
      // Fetch nearby places and transit in parallel
      const [nearbyPlaces, transitStops] = await Promise.all([
        this.getNearbyPlaces(lat, lng, radius),
        this.getNearbyTransit(lat, lng, radius)
      ]);

      // Calculate individual scores
      const walkability = this.calculateWalkabilityScore(nearbyPlaces);
      const transit = this.calculateTransitScore(transitStops);
      const amenities = this.calculateAmenitiesScore(nearbyPlaces);

      // Overall score (weighted average)
      const overall = Math.round(
        walkability * 0.4 + 
        transit * 0.3 + 
        amenities * 0.3
      );

      return {
        walkability,
        transit,
        amenities,
        overall,
        nearbyPlaces: nearbyPlaces.slice(0, 10), // Top 10
        transitStops: transitStops.slice(0, 5),   // Top 5
        description: this.getScoreDescription(overall)
      };
    } catch (error) {
      console.error('Location score calculation failed:', error);
      return this.getFallbackScores();
    }
  }

  /**
   * Get nearby places using Google Places API
   */
  private async getNearbyPlaces(
    lat: number,
    lng: number,
    radius: number
  ): Promise<NearbyPlace[]> {
    const allPlaces: NearbyPlace[] = [];

    // Limit to 3 place types to minimize API calls
    const typesToQuery = WALKABILITY_PLACES.slice(0, 3);

    for (const type of typesToQuery) {
      try {
        const url = `${this.baseUrl}/place/nearbysearch/json?` +
          `location=${lat},${lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results) {
          for (const place of data.results.slice(0, 5)) {
            const distance = this.calculateDistance(
              lat, lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            );
            
            allPlaces.push({
              name: place.name,
              type: type.replace(/_/g, ' '),
              distance: Math.round(distance),
              walkTime: Math.round(distance / 80) // ~80m per minute walking
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${type} places:`, error);
      }
    }

    // Sort by distance and remove duplicates
    const seen = new Set<string>();
    return allPlaces
      .sort((a, b) => a.distance - b.distance)
      .filter(place => {
        if (seen.has(place.name)) return false;
        seen.add(place.name);
        return true;
      });
  }

  /**
   * Get nearby transit stops
   */
  private async getNearbyTransit(
    lat: number,
    lng: number,
    radius: number
  ): Promise<TransitStop[]> {
    const transitStops: TransitStop[] = [];

    for (const type of TRANSIT_TYPES) {
      try {
        const url = `${this.baseUrl}/place/nearbysearch/json?` +
          `location=${lat},${lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results) {
          for (const stop of data.results.slice(0, 3)) {
            const distance = this.calculateDistance(
              lat, lng,
              stop.geometry.location.lat,
              stop.geometry.location.lng
            );

            transitStops.push({
              name: stop.name,
              type: this.mapTransitType(type),
              distance: Math.round(distance)
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${type} transit:`, error);
      }
    }

    // Sort by distance and remove duplicates
    const seen = new Set<string>();
    return transitStops
      .sort((a, b) => a.distance - b.distance)
      .filter(stop => {
        if (seen.has(stop.name)) return false;
        seen.add(stop.name);
        return true;
      });
  }

  /**
   * Calculate walkability score based on nearby places
   */
  private calculateWalkabilityScore(places: NearbyPlace[]): number {
    if (places.length === 0) return 20;

    const within500m = places.filter(p => p.distance <= 500).length;
    const within1km = places.filter(p => p.distance <= 1000).length;
    const uniqueTypes = new Set(places.map(p => p.type)).size;
    const avgDistance = places.reduce((sum, p) => sum + p.distance, 0) / places.length;

    let score = 0;
    
    // Points for nearby places (max 40)
    score += Math.min(within500m * 5, 25);
    score += Math.min(within1km * 2, 15);
    
    // Points for variety (max 30)
    score += Math.min(uniqueTypes * 5, 30);
    
    // Points for proximity (max 30)
    if (avgDistance < 300) score += 30;
    else if (avgDistance < 500) score += 25;
    else if (avgDistance < 750) score += 20;
    else if (avgDistance < 1000) score += 15;
    else score += 10;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate transit score based on nearby stops
   */
  private calculateTransitScore(stops: TransitStop[]): number {
    if (stops.length === 0) return 10;

    let score = 0;
    
    // Points for having transit nearby
    const hasSubway = stops.some(s => s.type === 'subway');
    const hasTrain = stops.some(s => s.type === 'train');
    const hasBus = stops.some(s => s.type === 'bus');

    if (hasSubway) score += 35;
    if (hasTrain) score += 25;
    if (hasBus) score += 20;

    // Points for proximity (closest stop)
    const closestDistance = Math.min(...stops.map(s => s.distance));
    if (closestDistance < 200) score += 20;
    else if (closestDistance < 400) score += 15;
    else if (closestDistance < 600) score += 10;
    else score += 5;

    return Math.min(Math.max(score, 0), 100);
  }

  /**
   * Calculate amenities score
   */
  private calculateAmenitiesScore(places: NearbyPlace[]): number {
    const categories: Record<string, string[]> = {
      essential: ['grocery', 'supermarket', 'pharmacy', 'bank'],
      dining: ['restaurant', 'cafe', 'bakery'],
      shopping: ['mall', 'store', 'convenience'],
      fitness: ['gym', 'park']
    };

    let score = 0;
    const foundCategories = new Set<string>();

    for (const place of places) {
      const placeTypeLower = place.type.toLowerCase();
      
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(k => placeTypeLower.includes(k))) {
          foundCategories.add(category);
        }
      }
    }

    // 25 points per category found (max 100)
    score = foundCategories.size * 25;

    return Math.min(score, 100);
  }

  /**
   * Get human-readable description for score
   */
  private getScoreDescription(score: number): string {
    if (score >= 90) return "Walker's Paradise - Daily errands don't require a car";
    if (score >= 70) return "Very Walkable - Most errands can be done on foot";
    if (score >= 50) return "Somewhat Walkable - Some errands can be done on foot";
    if (score >= 25) return "Car-Dependent - Most errands require a car";
    return "Almost All Errands Require a Car";
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    lat1: number, lng1: number,
    lat2: number, lng2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapTransitType(googleType: string): 'bus' | 'subway' | 'train' | 'tram' {
    if (googleType.includes('subway')) return 'subway';
    if (googleType.includes('train')) return 'train';
    if (googleType.includes('bus')) return 'bus';
    return 'tram';
  }

  private getFallbackScores(): LocationScores {
    return {
      walkability: 50,
      transit: 50,
      amenities: 50,
      overall: 50,
      nearbyPlaces: [],
      transitStops: [],
      description: 'Location score unavailable - API key not configured'
    };
  }
}

// Export singleton instance
export const locationScoreService = new LocationScoreService();
