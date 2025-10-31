/**
 * Search Utilities
 * Handles apartment search, filtering, ranking, and query building
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-load Supabase client - allows dependency injection for testing
function getSupabaseClientInstance(client?: SupabaseClient) {
  if (client) return client;
  
  // Lazy initialize only when called (not at module load time)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient(url, key);
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Budget {
  min?: number;
  max?: number;
}

export interface SearchFilters {
  location?: string;
  budget?: Budget;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  propertyType?: string;
  furnished?: boolean;
  petsAllowed?: boolean;
  availableFrom?: Date;
  availableTo?: Date;
}

export interface Apartment {
  id: string;
  title: string;
  description: string;
  price_per_month: number;
  bedrooms: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  amenities: string[];
  property_type: string;
  furnished: boolean;
  pets_allowed: boolean;
  available_from: string;
  available_to?: string;
  images: string[];
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface RankedApartment extends Apartment {
  locationScore: number;
  priceScore: number;
  amenityScore: number;
  compositeScore: number;
}

/**
 * Calculate location score based on distance from user location
 */
export function calculateLocationScore(apartment: any, userLocation: Location): number {
  if (!apartment.latitude || !apartment.longitude) return 0;

  const distance = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    apartment.latitude,
    apartment.longitude
  );

  // Score decreases with distance
  // Perfect score within 1km, 0 score beyond 20km
  if (distance <= 1) return 100;
  if (distance >= 20) return 0;

  return Math.max(0, 100 - (distance - 1) * (100 / 19));
}

/**
 * Calculate price score based on budget compatibility
 */
export function calculatePriceScore(apartment: any, userBudget: Budget): number {
  if (!apartment.price_per_month) return 0;
  if (!userBudget.min && !userBudget.max) return 100;

  const price = apartment.price_per_month;

  if (userBudget.min && price < userBudget.min) {
    // Price too low - some penalty but not complete rejection
    const underBy = userBudget.min - price;
    const penalty = Math.min(50, underBy / userBudget.min * 25);
    return Math.max(0, 100 - penalty);
  }

  if (userBudget.max && price > userBudget.max) {
    // Price too high - score decreases with how much over budget
    const overBy = price - userBudget.max;
    const penalty = Math.min(100, overBy / userBudget.max * 50);
    return Math.max(0, 100 - penalty);
  }

  return 100; // Perfect match
}

/**
 * Calculate amenity score based on user preferences
 */
export function calculateAmenityScore(apartment: any, userAmenities: string[]): number {
  if (!userAmenities || userAmenities.length === 0) return 100;
  if (!apartment.amenities || apartment.amenities.length === 0) return 0;

  const apartmentAmenities = apartment.amenities.map((a: string) => a.toLowerCase());
  const matchingAmenities = userAmenities.filter((amenity: string) =>
    apartmentAmenities.includes(amenity.toLowerCase())
  );

  return (matchingAmenities.length / userAmenities.length) * 100;
}

/**
 * Rank apartments based on multiple criteria
 */
export function rankApartments(apartments: any[], userPreferences: any): RankedApartment[] {
  if (!apartments || apartments.length === 0) return [];

  const weights = {
    location: 0.4,
    price: 0.35,
    amenities: 0.25,
  };

  return apartments
    .map((apartment) => {
      const locationScore = userPreferences.location
        ? calculateLocationScore(apartment, userPreferences.location)
        : 50; // Neutral score if no location preference

      const priceScore = userPreferences.budget
        ? calculatePriceScore(apartment, userPreferences.budget)
        : 50; // Neutral score if no budget preference

      const amenityScore = userPreferences.amenities
        ? calculateAmenityScore(apartment, userPreferences.amenities)
        : 50; // Neutral score if no amenity preferences

      const compositeScore =
        locationScore * weights.location +
        priceScore * weights.price +
        amenityScore * weights.amenities;

      return {
        ...apartment,
        locationScore,
        priceScore,
        amenityScore,
        compositeScore,
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

/**
 * Parse search filters from query parameters
 */
export function parseSearchFilters(query: any): SearchFilters {
  const filters: SearchFilters = {
    amenities: [],
  };

  if (query.location) {
    filters.location = query.location;
  }

  if (query.minPrice) {
    const minPrice = parseFloat(query.minPrice);
    if (!isNaN(minPrice)) {
      filters.budget = filters.budget || {};
      filters.budget.min = minPrice;
    }
  }

  if (query.maxPrice) {
    const maxPrice = parseFloat(query.maxPrice);
    if (!isNaN(maxPrice)) {
      filters.budget = filters.budget || {};
      filters.budget.max = maxPrice;
    }
  }

  if (query.bedrooms) {
    const bedrooms = parseInt(query.bedrooms);
    if (!isNaN(bedrooms)) {
      filters.bedrooms = bedrooms;
    }
  }

  if (query.bathrooms) {
    const bathrooms = parseInt(query.bathrooms);
    if (!isNaN(bathrooms)) {
      filters.bathrooms = bathrooms;
    }
  }

  if (query.amenities) {
    const amenities = Array.isArray(query.amenities)
      ? query.amenities
      : query.amenities.split(',');
    filters.amenities = amenities.map((a: string) => a.trim().toLowerCase());
  }

  if (query.propertyType) {
    filters.propertyType = query.propertyType;
  }

  if (query.furnished !== undefined) {
    filters.furnished = query.furnished === 'true';
  }

  if (query.petsAllowed !== undefined) {
    filters.petsAllowed = query.petsAllowed === 'true';
  }

  if (query.availableFrom) {
    filters.availableFrom = new Date(query.availableFrom);
  }

  if (query.availableTo) {
    filters.availableTo = new Date(query.availableTo);
  }

  return filters;
}

/**
 * Build Supabase query from search filters
 */
export function buildSearchQuery(supabaseClient: any, filters: SearchFilters) {
  let query = supabaseClient
    .from('apartments')
    .select(`
      *,
      owner:profiles!apartments_owner_id_fkey (
        id,
        first_name,
        last_name,
        avatar_url,
        verification_status
      )
    `);

  // Location-based search (using PostGIS)
  if (filters.location) {
    // This would use a more complex geospatial query in production
    query = query.ilike('title', `%${filters.location}%`);
  }

  // Price range
  if (filters.budget?.min !== undefined) {
    query = query.gte('price_per_month', filters.budget.min);
  }
  if (filters.budget?.max !== undefined) {
    query = query.lte('price_per_month', filters.budget.max);
  }

  // Bedrooms
  if (filters.bedrooms !== undefined) {
    query = query.eq('bedrooms', filters.bedrooms);
  }

  // Bathrooms
  if (filters.bathrooms !== undefined) {
    query = query.eq('bathrooms', filters.bathrooms);
  }

  // Amenities (array contains)
  if (filters.amenities && filters.amenities.length > 0) {
    // This would require a more complex query in production
    // For now, we'll use a simple approach
    filters.amenities.forEach(amenity => {
      query = query.ilike('amenities', `%${amenity}%`);
    });
  }

  // Property type
  if (filters.propertyType) {
    query = query.eq('property_type', filters.propertyType);
  }

  // Furnished
  if (filters.furnished !== undefined) {
    query = query.eq('furnished', filters.furnished);
  }

  // Pets allowed
  if (filters.petsAllowed !== undefined) {
    query = query.eq('pets_allowed', filters.petsAllowed);
  }

  // Availability dates
  if (filters.availableFrom) {
    query = query.gte('available_from', filters.availableFrom.toISOString());
  }
  if (filters.availableTo) {
    query = query.lte('available_to', filters.availableTo.toISOString());
  }

  return query.order('created_at', { ascending: false });
}

/**
 * Filter apartments based on criteria (client-side filtering)
 */
export function filterApartments(apartments: Apartment[], filters: SearchFilters): Apartment[] {
  return apartments.filter((apartment) => {
    // Budget filter
    if (filters.budget?.min !== undefined && apartment.price_per_month < filters.budget.min) {
      return false;
    }
    if (filters.budget?.max !== undefined && apartment.price_per_month > filters.budget.max) {
      return false;
    }

    // Bedrooms filter
    if (filters.bedrooms !== undefined && apartment.bedrooms !== filters.bedrooms) {
      return false;
    }

    // Bathrooms filter
    if (filters.bathrooms !== undefined && apartment.bathrooms !== filters.bathrooms) {
      return false;
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      const hasAllAmenities = filters.amenities.every(amenity =>
        apartment.amenities.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
      );
      if (!hasAllAmenities) return false;
    }

    // Property type filter
    if (filters.propertyType && apartment.property_type !== filters.propertyType) {
      return false;
    }

    // Furnished filter
    if (filters.furnished !== undefined && apartment.furnished !== filters.furnished) {
      return false;
    }

    // Pets allowed filter
    if (filters.petsAllowed !== undefined && apartment.pets_allowed !== filters.petsAllowed) {
      return false;
    }

    // Availability filters
    if (filters.availableFrom) {
      const availableFrom = new Date(apartment.available_from);
      if (availableFrom > filters.availableFrom) return false;
    }

    if (filters.availableTo && apartment.available_to) {
      const availableTo = new Date(apartment.available_to);
      if (availableTo < filters.availableTo) return false;
    }

    return true;
  });
}

/**
 * Search apartments with full pipeline
 */
export async function searchApartments(filters: SearchFilters, userPreferences?: any, supabaseClient?: SupabaseClient): Promise<RankedApartment[]> {
  try {
    const client = getSupabaseClientInstance(supabaseClient);
    const query = buildSearchQuery(client, filters);
    const { data: apartments, error } = await query.limit(100);

    if (error) {
      console.error('Search error:', error);
      return [];
    }

    if (!apartments) return [];

    // Apply client-side filtering and ranking
    const filtered = filterApartments(apartments, filters);
    const ranked = rankApartments(filtered, userPreferences || {});

    return ranked;
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}