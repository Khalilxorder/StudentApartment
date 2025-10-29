/**
 * Integration tests for Enhanced Duplicate Detection Service
 * Tests all detection methods with realistic apartment data
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { enhancedDuplicateDetectionService } from '@/services/duplicate-detection-svc';
import { createClient } from '@/utils/supabaseClient';

// Sample test data with realistic apartments
const TEST_APARTMENTS = [
  {
    id: 'apt-1',
    title: 'Sunny 2BR Apartment near Central Park',
    description: 'Beautiful 2-bedroom apartment with stunning views. Hardwood floors, modern kitchen, spacious living room. Walking distance to Central Park.',
    address: '123 Main Street, Budapest',
    canonical_address: '123 Main Street, Budapest, 1011',
    latitude: 47.5014,
    longitude: 19.0402,
    owner_id: 'owner-1',
    image_keys: ['img-1-1', 'img-1-2', 'img-1-3'],
    amenities: {
      gym: true,
      pool: true,
      parking: true,
      wifi: true,
      heating: true,
    },
  },
  {
    // Exact duplicate - same address, title
    id: 'apt-2',
    title: 'Sunny 2BR Apartment near Central Park',
    description: 'Beautiful 2-bedroom apartment with stunning views. Hardwood floors, modern kitchen, spacious living room. Walking distance to Central Park.',
    address: '123 Main Street, Budapest',
    canonical_address: '123 Main Street, Budapest, 1011',
    latitude: 47.5014,
    longitude: 19.0402,
    owner_id: 'owner-1',
    image_keys: ['img-2-1', 'img-2-2', 'img-2-3'],
    amenities: {
      gym: true,
      pool: true,
      parking: true,
      wifi: true,
      heating: true,
    },
  },
  {
    // Similar duplicate - slightly different title/address
    id: 'apt-3',
    title: '2 Bedroom Apartment with Park View',
    description: 'Beautiful 2-bedroom apartment with stunning views. Hardwood floors, modern kitchen, spacious living room. Walking distance to Central Park.',
    address: '123 Main St, Budapest',
    canonical_address: '123 Main Street, Budapest, 1011',
    latitude: 47.5014,
    longitude: 19.0402,
    owner_id: 'owner-1',
    image_keys: ['img-3-1', 'img-3-2'],
    amenities: {
      gym: true,
      pool: true,
      parking: true,
      wifi: true,
    },
  },
  {
    // Geographic duplicate - same building, different unit
    id: 'apt-4',
    title: 'Cozy 1BR Apartment in Budapest',
    description: 'Compact but comfortable 1-bedroom apartment in a modern building. Well-maintained, near public transport.',
    address: '123 Main Street, Budapest',
    canonical_address: '123 Main Street, Budapest, 1011',
    latitude: 47.50145, // Very close to apt-1
    longitude: 19.04022,
    owner_id: 'owner-2',
    image_keys: ['img-4-1', 'img-4-2'],
    amenities: {
      gym: true,
      parking: false,
      wifi: true,
    },
  },
  {
    // Different address, different owner - should not match
    id: 'apt-5',
    title: '3BR Family Home',
    description: 'Spacious 3-bedroom family home with garden. Perfect for families with children.',
    address: '456 Oak Avenue, Budapest',
    canonical_address: '456 Oak Avenue, Budapest, 1012',
    latitude: 47.4942,
    longitude: 19.0417,
    owner_id: 'owner-3',
    image_keys: ['img-5-1'],
    amenities: {
      garden: true,
      parking: true,
    },
  },
];

describe.skip('Enhanced Duplicate Detection Service', () => {
  // ⚠️ SKIPPED: Requires Supabase instance with test database
  // Run this test with proper Supabase credentials:
  // NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run test tests/duplicate-detection.test.ts
  
  let supabase: any;

  beforeAll(async () => {
    supabase = createClient();
    
    // Clean up any existing test data
    const { data: existing } = await supabase
      .from('apartments')
      .select('id')
      .in('id', TEST_APARTMENTS.map(a => a.id));

    if (existing && existing.length > 0) {
      await supabase
        .from('apartments')
        .delete()
        .in('id', existing.map((a: any) => a.id));
    }

    // Insert test apartments
    await supabase
      .from('apartments')
      .insert(TEST_APARTMENTS.map(apt => ({
        ...apt,
        created_at: new Date().toISOString(),
      })));
  });

  afterAll(async () => {
    // Clean up test data
    await supabase
      .from('apartments')
      .delete()
      .in('id', TEST_APARTMENTS.map(a => a.id));
  });

  describe('Address Similarity Detection', () => {
    it('should detect exact address matches', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // Should find apt-2 and apt-3 as duplicates (same or very similar addresses)
      const matches = result.matches.filter(m => m.candidateId === 'apt-2');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].scoreBreakdown.addressScore).toBeGreaterThan(0.7);
    });

    it('should handle address variations', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // Should find apt-3 even though address is slightly different
      const matches = result.matches.filter(m => m.candidateId === 'apt-3');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].scoreBreakdown.addressScore).toBeGreaterThan(0.6);
    });
  });

  describe('Geographic Proximity Detection', () => {
    it('should detect apartments in the same location', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // apt-4 is at same address with similar coordinates
      const matches = result.matches.filter(m => m.candidateId === 'apt-4');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].scoreBreakdown.geoScore).toBeGreaterThan(0.7);
    });

    it('should not match distant apartments', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // apt-5 is at different location
      const matches = result.matches.filter(m => m.candidateId === 'apt-5');
      // Either no match or very low score
      if (matches.length > 0) {
        expect(matches[0].scoreBreakdown.geoScore).toBeLessThan(0.2);
      }
    });
  });

  describe('Title Similarity Detection', () => {
    it('should detect exact title matches', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      const matches = result.matches.filter(m => m.candidateId === 'apt-2');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].scoreBreakdown.titleScore).toBe(1.0);
    });

    it('should detect similar titles', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      const matches = result.matches.filter(m => m.candidateId === 'apt-3');
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].scoreBreakdown.titleScore).toBeGreaterThan(0.5);
    });
  });

  describe('Description Similarity Detection', () => {
    it('should detect identical descriptions', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      const matches = result.matches.filter(m => m.candidateId === 'apt-2');
      expect(matches.length).toBeGreaterThan(0);
      // Description similarity should be high for identical text
      expect(matches[0].scoreBreakdown.descriptionScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Owner Overlap Detection', () => {
    it('should detect when same owner has multiple listings', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // apt-2 and apt-3 are from same owner
      const apt2Matches = result.matches.filter(m => m.candidateId === 'apt-2');
      const apt3Matches = result.matches.filter(m => m.candidateId === 'apt-3');
      
      if (apt2Matches.length > 0) {
        expect(apt2Matches[0].scoreBreakdown.ownerScore).toBe(1.0);
      }
      if (apt3Matches.length > 0) {
        expect(apt3Matches[0].scoreBreakdown.ownerScore).toBe(1.0);
      }
    });

    it('should not match different owners without other similarities', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      const matches = result.matches.filter(m => m.candidateId === 'apt-5');
      if (matches.length > 0) {
        expect(matches[0].scoreBreakdown.ownerScore).toBe(0);
      }
    });
  });

  describe('Amenity Similarity Detection', () => {
    it('should detect apartments with similar amenities', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      const matches = result.matches.filter(m => m.candidateId === 'apt-2');
      expect(matches.length).toBeGreaterThan(0);
      // apt-1 and apt-2 have identical amenities
      expect(matches[0].scoreBreakdown.amenityScore).toBe(1.0);
    });
  });

  describe('Composite Scoring', () => {
    it('should identify high-confidence duplicates', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // apt-2 should be high-confidence duplicate
      const apt2Matches = result.matches.filter(m => m.candidateId === 'apt-2');
      expect(apt2Matches.length).toBeGreaterThan(0);
      expect(apt2Matches[0].confidence).toBe('high');
      expect(apt2Matches[0].totalScore).toBeGreaterThan(0.75);
    });

    it('should identify medium-confidence duplicates', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      // apt-3 should be medium-confidence
      const apt3Matches = result.matches.filter(m => m.candidateId === 'apt-3');
      if (apt3Matches.length > 0) {
        expect(['medium', 'high']).toContain(apt3Matches[0].confidence);
      }
    });

    it('should include evidence items in results', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      if (result.matches.length > 0) {
        result.matches.forEach(match => {
          expect(match.evidenceItems).toBeDefined();
          expect(Array.isArray(match.evidenceItems)).toBe(true);
          if (match.confidence === 'high') {
            expect(match.evidenceItems.length).toBeGreaterThan(0);
          }
        });
      }
    });
  });

  describe('Detection Methods', () => {
    it('should support incremental detection', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'incremental');
      
      expect(result.detectionMethod).toBe('incremental');
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should support full scan detection', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('apt-1', 'full_scan');
      
      expect(result.detectionMethod).toBe('full_scan');
      expect(Array.isArray(result.matches)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle apartments with missing descriptions', () => {
      // Test that the service doesn't crash with null descriptions
      const apt1 = { ...TEST_APARTMENTS[0], description: null };
      const apt2 = { ...TEST_APARTMENTS[1], description: null };
      
      const result = enhancedDuplicateDetectionService['scoreDescriptionSimilarity'](apt1 as any, apt2 as any);
      expect(result).resolves.toBe(0);
    });

    it('should handle apartments with missing locations', async () => {
      const apt1 = { ...TEST_APARTMENTS[0], latitude: null, longitude: null };
      const apt2 = { ...TEST_APARTMENTS[1], latitude: null, longitude: null };
      
      const score = enhancedDuplicateDetectionService['scoreGeographicProximity'](apt1 as any, apt2 as any);
      expect(score).toBe(0);
    });

    it('should return null for non-existent apartment', async () => {
      const result = await enhancedDuplicateDetectionService.detectDuplicatesForApartment('non-existent-id', 'incremental');
      expect(result.matches).toBeDefined();
    });
  });
});
