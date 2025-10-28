/**
 * Unit Tests for Search Utilities
 * Tests apartment search, filtering, and ranking algorithms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  searchApartments,
  filterApartments,
  rankApartments,
  calculateLocationScore,
  calculatePriceScore,
  calculateAmenityScore,
  buildSearchQuery,
  parseSearchFilters,
} from '../../lib/search';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })),
    })),
  })),
}));

describe('Search Utilities', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        })),
      })),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateLocationScore', () => {
    it('should calculate score based on distance', () => {
      const apartment = { latitude: 40.7128, longitude: -74.0060 };
      const userLocation = { latitude: 40.7128, longitude: -74.0060 };

      expect(calculateLocationScore(apartment, userLocation)).toBe(100); // Exact location
    });
  });

  describe('calculatePriceScore', () => {
    it('should calculate score based on price difference', () => {
      const apartment = { price_per_month: 1500 };
      const budget = { min: 1000, max: 2000 };

      expect(calculatePriceScore(apartment, budget)).toBe(100); // Within budget
    });
  });

  describe('calculateAmenityScore', () => {
    it('should calculate score based on apartment amenities', () => {
      const apartment = {
        amenities: ['balcony', 'parking', 'elevator', 'pet-friendly', 'furnished'],
      };
      const userAmenities = ['balcony', 'parking'];

      const score = calculateAmenityScore(apartment, userAmenities);
      expect(score).toBe(100); // All requested amenities present
    });
  });

  describe('rankApartments', () => {
    it('should rank apartments by composite score', () => {
      const apartments = [
        {
          id: '1',
          price_per_month: 1200,
          latitude: 40.7128,
          longitude: -74.0060,
          amenities: [],
        },
        {
          id: '2',
          price_per_month: 2500,
          latitude: 40.7128,
          longitude: -74.0060,
          amenities: ['has_balcony', 'has_parking', 'has_elevator', 'pet_friendly', 'furnished'],
        },
        {
          id: '3',
          price_per_month: 1500,
          latitude: 40.7128,
          longitude: -74.0060,
          amenities: ['has_balcony', 'has_parking', 'has_elevator', 'pet_friendly', 'furnished'],
        },
      ];

      const userPreferences = {
        budget: { min: 1000, max: 2000 },
        location: { latitude: 40.7128, longitude: -74.0060 },
        amenities: ['has_balcony', 'has_parking'],
      };

      const ranked = rankApartments(apartments, userPreferences);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].id).toBe('3'); // Best match - within budget, all amenities
      expect(ranked[1].id).toBe('2'); // Second best - over budget but all amenities
      expect(ranked[2].id).toBe('1'); // Third - within budget but no amenities
    });

    it('should handle empty apartment list', () => {
      const ranked = rankApartments([], {});
      expect(ranked).toEqual([]);
    });

    it('should handle apartments without coordinates', () => {
      const apartments = [
        {
          id: '1',
          price_per_month: 1500,
          has_balcony: true,
        },
      ];

      const ranked = rankApartments(apartments, {});
      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('1');
    });
  });

  describe('parseSearchFilters', () => {
    it('should parse basic search parameters', () => {
      const query = {
        minPrice: '1000',
        maxPrice: '2000',
        location: 'New York',
        amenities: ['has_balcony', 'has_parking'],
      };

      const filters = parseSearchFilters(query);

      expect(filters.budget?.min).toBe(1000);
      expect(filters.budget?.max).toBe(2000);
      expect(filters.location).toBe('New York');
      expect(filters.amenities).toEqual(['has_balcony', 'has_parking']);
    });

    it('should handle missing parameters', () => {
      const query = {};

      const filters = parseSearchFilters(query);

      expect(filters.location).toBeUndefined();
      expect(filters.budget?.min).toBeUndefined();
      expect(filters.budget?.max).toBeUndefined();
      expect(filters.amenities).toEqual([]);
    });

    it('should parse numeric values', () => {
      const query = {
        minPrice: '1500',
        maxPrice: '2500',
      };

      const filters = parseSearchFilters(query);

      expect(filters.budget?.min).toBe(1500);
      expect(filters.budget?.max).toBe(2500);
    });

    it('should handle invalid numeric values', () => {
      const query = {
        minPrice: 'invalid',
        maxPrice: 'also_invalid',
      };

      const filters = parseSearchFilters(query);

      expect(filters.budget?.min).toBeUndefined();
      expect(filters.budget?.max).toBeUndefined();
    });
  });

  describe('buildSearchQuery', () => {
    it('should build query with location filter', async () => {
      const filters = { location: 'New York' };

      const query = buildSearchQuery(mockSupabase, filters);

      expect(mockSupabase.from).toHaveBeenCalledWith('apartments');
    });

    it('should build query with price range', async () => {
      const filters = { budget: { min: 1000, max: 2000 } };

      const query = buildSearchQuery(mockSupabase, filters);

      expect(mockSupabase.from).toHaveBeenCalledWith('apartments');
    });

    it('should build query with amenities filter', async () => {
      const filters = { amenities: ['has_balcony'] };

      const query = buildSearchQuery(mockSupabase, filters);

      expect(mockSupabase.from).toHaveBeenCalledWith('apartments');
    });

    it('should handle complex filter combination', async () => {
      const filters = {
        location: 'New York',
        budget: { min: 1000, max: 2000 },
        amenities: ['has_balcony', 'has_parking'],
      };

      const query = buildSearchQuery(mockSupabase, filters);

      expect(mockSupabase.from).toHaveBeenCalledWith('apartments');
    });
  });

  describe('filterApartments', () => {
    it('should filter apartments based on criteria', () => {
      const apartments = [
        {
          id: '1',
          title: 'Test Apartment 1',
          description: 'A nice apartment',
          price_per_month: 1500,
          bedrooms: 2,
          bathrooms: 1,
          latitude: 40.7128,
          longitude: -74.0060,
          amenities: ['balcony'],
          property_type: 'apartment',
          furnished: false,
          pets_allowed: false,
          available_from: '2024-01-01',
          images: [],
          owner_id: 'owner1',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          title: 'Test Apartment 2',
          description: 'Another apartment',
          price_per_month: 2500,
          bedrooms: 3,
          bathrooms: 2,
          latitude: 40.7128,
          longitude: -74.0060,
          amenities: ['parking'],
          property_type: 'house',
          furnished: true,
          pets_allowed: true,
          available_from: '2024-01-01',
          images: [],
          owner_id: 'owner2',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const filters = {
        budget: { min: 1000, max: 2000 },
        amenities: ['balcony'],
      };

      const filtered = filterApartments(apartments, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });
  });
});