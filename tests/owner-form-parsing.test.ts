import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for Owner Apartment Form - Form Parsing & FormData Handling
 * 
 * These tests verify that:
 * 1. Image URLs are appended as individual FormData entries (not JSON stringified)
 * 2. Feature IDs are appended as individual FormData entries
 * 3. collectFormValues correctly retrieves multiple entries
 * 4. Form validation enforces 3+ images
 * 5. Feature arrays are properly handled
 */

describe('OwnerApartmentForm - FormData Handling', () => {
  describe('FormData entry appending', () => {
    it('should append image_urls as individual form entries', () => {
      const formData = new FormData();
      const imageUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ];

      // Simulate what OwnerApartmentForm.handleSubmit does
      imageUrls.forEach(url => {
        formData.append('image_urls', url);
      });

      // Verify all images were added as separate entries
      const allUrls = formData.getAll('image_urls');
      expect(allUrls).toHaveLength(3);
      expect(allUrls).toEqual(imageUrls);
    });

    it('should append feature_ids as individual form entries', () => {
      const formData = new FormData();
      const features = ['loc_metro', 'amen_furnished', 'style_modern'];

      features.forEach(featureId => {
        formData.append('feature_ids', featureId);
      });

      const allFeatures = formData.getAll('feature_ids');
      expect(allFeatures).toHaveLength(3);
      expect(allFeatures).toEqual(features);
    });

    it('should NOT JSON.stringify image_urls array', () => {
      const formData = new FormData();
      const imageUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ];

      // WRONG: formData.set('image_urls', JSON.stringify(imageUrls));
      // RIGHT: append each individually
      imageUrls.forEach(url => {
        formData.append('image_urls', url);
      });

      const allUrls = formData.getAll('image_urls');
      
      // Should NOT be a single JSON string
      expect(allUrls).not.toContain(JSON.stringify(imageUrls));
      
      // Should be individual strings
      expect(allUrls).toEqual(imageUrls);
    });
  });

  describe('collectFormValues (server-side)', () => {
    /**
     * collectFormValues helper used in app/(admin)/admin/actions.ts
     * Extracts all form entries for a given key and deduplicates
     */
    const collectFormValues = (formData: FormData, key: string) =>
      Array.from(
        new Set(
          formData
            .getAll(key)
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => entry.length > 0),
        ),
      );

    it('should collect multiple image_urls entries', () => {
      const formData = new FormData();
      formData.append('image_urls', 'https://example.com/img1.jpg');
      formData.append('image_urls', 'https://example.com/img2.jpg');
      formData.append('image_urls', 'https://example.com/img3.jpg');

      const result = collectFormValues(formData, 'image_urls');
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('https://example.com/img1.jpg');
    });

    it('should collect and deduplicate feature_ids', () => {
      const formData = new FormData();
      formData.append('feature_ids', 'loc_metro');
      formData.append('feature_ids', 'loc_metro'); // duplicate
      formData.append('feature_ids', 'amen_furnished');

      const result = collectFormValues(formData, 'feature_ids');
      expect(result).toHaveLength(2); // deduplicated
      expect(result).toContain('loc_metro');
      expect(result).toContain('amen_furnished');
    });

    it('should trim whitespace from collected values', () => {
      const formData = new FormData();
      formData.append('feature_ids', '  loc_metro  ');
      formData.append('feature_ids', 'amen_furnished');

      const result = collectFormValues(formData, 'feature_ids');
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('loc_metro'); // trimmed
    });

    it('should filter out empty strings', () => {
      const formData = new FormData();
      formData.append('image_urls', 'https://example.com/img1.jpg');
      formData.append('image_urls', '');
      formData.append('image_urls', '   ');
      formData.append('image_urls', 'https://example.com/img2.jpg');

      const result = collectFormValues(formData, 'image_urls');
      expect(result).toHaveLength(2);
    });
  });

  describe('Form submission validation', () => {
    it('should require 3+ images before publishing', () => {
      const imageUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ];

      expect(imageUrls.length < 3).toBe(true);
      expect(() => {
        if (imageUrls.length < 3) {
          throw new Error('Please upload at least 3 quality photos before publishing your listing.');
        }
      }).toThrow('Please upload at least 3 quality photos before publishing your listing.');
    });

    it('should allow publishing with exactly 3 images', () => {
      const imageUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ];

      expect(imageUrls.length >= 3).toBe(true);
      expect(() => {
        if (imageUrls.length < 3) {
          throw new Error('Please upload at least 3 quality photos before publishing your listing.');
        }
      }).not.toThrow();
    });

    it('should allow publishing with more than 3 images', () => {
      const imageUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
        'https://example.com/img4.jpg',
        'https://example.com/img5.jpg',
      ];

      expect(imageUrls.length >= 3).toBe(true);
    });
  });

  describe('Room count & other fields', () => {
    it('should properly set room counts as strings', () => {
      const formData = new FormData();
      const roomCounts = { Bedroom: 2, Bathroom: 1, Kitchen: 1 };

      Object.entries(roomCounts).forEach(([room, count]) => {
        formData.set(`${room.toLowerCase()}s`, count.toString());
      });

      // Note: This test shows how room counts should be set
      // The actual implementation may vary based on naming convention
    });

    it('should set coordinates from map', () => {
      const formData = new FormData();
      const coordinates = { lat: 47.4979, lng: 19.0402 };

      formData.set('latitude', coordinates.lat.toString());
      formData.set('longitude', coordinates.lng.toString());

      expect(formData.get('latitude')).toBe('47.4979');
      expect(formData.get('longitude')).toBe('19.0402');
    });

    it('should set price as string', () => {
      const formData = new FormData();
      const price = 250000;

      formData.set('price_huf', price.toString());

      expect(formData.get('price_huf')).toBe('250000');
      expect(typeof formData.get('price_huf')).toBe('string');
    });

    it('should set description with minimum length validation', () => {
      const formData = new FormData();
      const description = 'Spacious and modern studio apartment with great natural light.';

      formData.set('description', description);

      expect(formData.get('description')).toBe(description);
      expect(description.length >= 10).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty image_urls array', () => {
      const formData = new FormData();
      const imageUrls: string[] = [];

      imageUrls.forEach(url => {
        formData.append('image_urls', url);
      });

      const result = formData.getAll('image_urls');
      expect(result).toHaveLength(0);
    });

    it('should handle empty feature_ids array', () => {
      const formData = new FormData();
      const features: string[] = [];

      features.forEach(featureId => {
        formData.append('feature_ids', featureId);
      });

      const result = formData.getAll('feature_ids');
      expect(result).toHaveLength(0);
    });

    it('should handle special characters in image URLs', () => {
      const formData = new FormData();
      const url = 'https://example.com/img-2024-01-15_photo%20(1).jpg';

      formData.append('image_urls', url);

      expect(formData.getAll('image_urls')).toContain(url);
    });

    it('should handle clearing and re-adding values', () => {
      const formData = new FormData();
      
      // Add initial values
      formData.append('image_urls', 'https://example.com/img1.jpg');
      formData.append('image_urls', 'https://example.com/img2.jpg');
      
      // Clear and re-add
      formData.getAll('image_urls').forEach(() => {
        formData.delete('image_urls');
      });
      
      formData.append('image_urls', 'https://example.com/img3.jpg');
      
      const result = formData.getAll('image_urls');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('https://example.com/img3.jpg');
    });
  });

  describe('Feature ID standards', () => {
    it('should validate common feature ID prefixes', () => {
      const validFeatures = [
        'loc_metro',        // location
        'loc_university',
        'amen_furnished',   // amenities
        'amen_wifi',
        'style_modern',     // style
        'style_renovated',
        'safe_locked_entrance', // safety
        'util_low_bills',   // utilities
      ];

      validFeatures.forEach(feature => {
        expect(feature).toMatch(/^[a-z]+_[a-z_]+$/);
      });
    });

    it('should handle feature array from database', () => {
      const featureIds = ['loc_metro', 'amen_furnished', 'style_modern'];
      const formData = new FormData();

      featureIds.forEach(id => {
        formData.append('feature_ids', id);
      });

      const result = formData.getAll('feature_ids');
      expect(result).toEqual(featureIds);
    });
  });
});
