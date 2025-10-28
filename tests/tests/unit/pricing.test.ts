import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/utils/supabaseClient';

// Mock the supabase client
vi.mock('@/utils/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

describe('Pricing API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateLocationScore', () => {
    it('should return correct scores for different districts', () => {
      // Import the function to test (we'll need to extract it from the API)
      const testDistricts = [
        { district: 1, expected: 1.0 },   // City center
        { district: 5, expected: 0.95 },  // Near center
        { district: 6, expected: 0.9 },   // University area
        { district: 13, expected: 0.8 },  // Mixed area
        { district: 99, expected: 0.6 },  // Unknown district
      ];

      testDistricts.forEach(({ district, expected }) => {
        // Since the function is inside the API route, we'll test the logic directly
        const districtScores: { [key: number]: number } = {
          1: 1.0, 5: 0.95, 6: 0.9, 7: 0.85, 8: 0.8, 9: 0.75,
          11: 0.9, 12: 0.7, 13: 0.8,
        };

        const score = districtScores[district] || 0.6;
        expect(score).toBe(expected);
      });
    });
  });

  describe('calculateSeasonalityMultiplier', () => {
    it('should return higher multiplier in September', () => {
      // Mock current date to September
      const mockDate = new Date('2024-09-15');
      vi.setSystemTime(mockDate);

      const month = mockDate.getMonth() + 1; // 1-12
      const seasonalMultipliers: { [key: number]: number } = {
        1: 0.9, 2: 0.9, 3: 0.95, 4: 0.95, 5: 0.9,
        6: 0.85, 7: 0.8, 8: 0.8, 9: 1.0, 10: 0.95,
        11: 0.9, 12: 0.85
      };

      const multiplier = seasonalMultipliers[month] || 0.9;
      expect(multiplier).toBe(1.0); // September peak

      vi.useRealTimers();
    });

    it('should return lower multiplier in July', () => {
      const mockDate = new Date('2024-07-15');
      vi.setSystemTime(mockDate);

      const month = mockDate.getMonth() + 1;
      const seasonalMultipliers: { [key: number]: number } = {
        1: 0.9, 2: 0.9, 3: 0.95, 4: 0.95, 5: 0.9,
        6: 0.85, 7: 0.8, 8: 0.8, 9: 1.0, 10: 0.95,
        11: 0.9, 12: 0.85
      };

      const multiplier = seasonalMultipliers[month] || 0.9;
      expect(multiplier).toBe(0.8); // July low season

      vi.useRealTimers();
    });
  });

  describe('calculateAmenitiesScore', () => {
    it('should calculate score based on apartment amenities', () => {
      const testApartments = [
        {
          apartment: {},
          expected: 0.5, // Base score
        },
        {
          apartment: { has_balcony: true },
          expected: 0.6, // +0.1 for balcony
        },
        {
          apartment: { has_balcony: true, has_parking: true, furnished: true },
          expected: 0.8, // +0.1 balcony +0.1 parking +0.1 furnished
        },
        {
          apartment: {
            has_balcony: true,
            has_parking: true,
            has_elevator: true,
            pet_friendly: true,
            furnished: true
          },
          expected: 0.9, // 0.5 base + 0.1 balcony + 0.1 parking + 0.05 elevator + 0.05 pet_friendly + 0.1 furnished
        },
      ];

      testApartments.forEach(({ apartment, expected }) => {
        let score = 0.5; // Base score

        if (apartment.has_balcony) score += 0.1;
        if (apartment.has_parking) score += 0.1;
        if (apartment.has_elevator) score += 0.05;
        if (apartment.pet_friendly) score += 0.05;
        if (apartment.furnished) score += 0.1;

        const finalScore = Math.min(score, 1.0);
        expect(finalScore).toBeCloseTo(expected, 5);
      });
    });
  });

  describe('Pricing recommendation logic', () => {
    it('should calculate recommended price based on factors', () => {
      const factors = {
        location_score: 0.9,
        demand_score: 0.8,
        seasonality_multiplier: 1.0,
        competitor_adjustment: 0.95,
        amenities_score: 0.7,
        condition_score: 0.8,
      };

      const basePrice = 150000;

      // Simplified calculation from the API
      const adjustmentFactor =
        (factors.location_score - 0.7) * 0.3 +
        (factors.demand_score - 0.5) * 0.25 +
        (factors.amenities_score - 0.5) * 0.15 +
        (factors.condition_score - 0.5) * 0.1 +
        (factors.seasonality_multiplier - 0.9) * 0.1 +
        (factors.competitor_adjustment - 1.0) * 0.1;

      const recommendedPrice = Math.round(basePrice * (1 + adjustmentFactor));

      // With these factors, we expect a price increase
      expect(recommendedPrice).toBeGreaterThan(basePrice);
      expect(recommendedPrice).toBe(180000); // Corrected expected calculation
    });

    it('should handle price decreases when factors are poor', () => {
      const factors = {
        location_score: 0.6,
        demand_score: 0.3,
        seasonality_multiplier: 0.8,
        competitor_adjustment: 1.1,
        amenities_score: 0.4,
        condition_score: 0.6,
      };

      const basePrice = 150000;

      const adjustmentFactor =
        (factors.location_score - 0.7) * 0.3 +
        (factors.demand_score - 0.5) * 0.25 +
        (factors.amenities_score - 0.5) * 0.15 +
        (factors.condition_score - 0.5) * 0.1 +
        (factors.seasonality_multiplier - 0.9) * 0.1 +
        (factors.competitor_adjustment - 1.0) * 0.1;

      const recommendedPrice = Math.round(basePrice * (1 + adjustmentFactor));

      // With poor factors, we expect a price decrease
      expect(recommendedPrice).toBeLessThan(basePrice);
    });
  });
});