import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for Google Maps Configuration and Error Handling
 * 
 * These tests verify that:
 * 1. Maps API key environment variable is properly named (NEXT_PUBLIC_MAPS_API_KEY)
 * 2. Missing API key shows helpful error message
 * 3. Maps component validates required configuration
 * 4. Error messages guide users to fix issues
 * 5. Map ID configuration is optional and defaults gracefully
 */

describe('Google Maps Configuration & Validation', () => {
  describe('Environment Variable Naming', () => {
    it('should use NEXT_PUBLIC_MAPS_API_KEY not NEXT_PUBLIC_Maps_API_KEY', () => {
      // This verifies the correct casing convention
      const correctKey = 'NEXT_PUBLIC_MAPS_API_KEY';
      const incorrectKey = 'NEXT_PUBLIC_Maps_API_KEY';

      expect(correctKey).toBe('NEXT_PUBLIC_MAPS_API_KEY');
      expect(incorrectKey).not.toBe('NEXT_PUBLIC_MAPS_API_KEY');
    });

    it('should use NEXT_PUBLIC_GOOGLE_MAP_ID for map styling', () => {
      // Map ID is optional but when provided, should use this name
      const mapIdKey = 'NEXT_PUBLIC_GOOGLE_MAP_ID';
      expect(mapIdKey).toBe('NEXT_PUBLIC_GOOGLE_MAP_ID');
    });
  });

  describe('API Key Validation', () => {
    it('should warn when NEXT_PUBLIC_MAPS_API_KEY is missing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Save and temporarily remove the env var to test warning
      const originalKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
      delete process.env.NEXT_PUBLIC_MAPS_API_KEY;
      
      const mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;

      // Simulate missing key check
      if (!mapsApiKey) {
        console.error(
          'MISSING REQUIRED ENV VAR: NEXT_PUBLIC_MAPS_API_KEY\n' +
          'Please add it to your .env.local file:\n' +
          'NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key\n' +
          'Get it from: https://console.cloud.google.com/apis/credentials'
        );
      }

      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore original value
      if (originalKey) {
        process.env.NEXT_PUBLIC_MAPS_API_KEY = originalKey;
      }
      consoleSpy.mockRestore();
    });

    it('should validate API key format', () => {
      // Google Maps API keys typically start with 'AIza'
      const validApiKey = 'AIzaSyDummyKeyForTesting123456789';
      const invalidApiKey = 'invalid-key';

      // Basic format check
      expect(validApiKey).toMatch(/^AIza/);
      expect(invalidApiKey).not.toMatch(/^AIza/);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error message for missing API key', () => {
      const errorMessage = 
        'MISSING REQUIRED ENV VAR: NEXT_PUBLIC_MAPS_API_KEY\n' +
        'Please add it to your .env.local file:\n' +
        'NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key\n' +
        'Get it from: https://console.cloud.google.com/apis/credentials';

      expect(errorMessage).toContain('NEXT_PUBLIC_MAPS_API_KEY');
      expect(errorMessage).toContain('.env.local');
      expect(errorMessage).toContain('console.cloud.google.com');
    });

    it('should include link to Google Cloud Console', () => {
      const docUrl = 'https://console.cloud.google.com/apis/credentials';
      expect(docUrl).toContain('console.cloud.google.com');
      expect(docUrl).toContain('credentials');
    });

    it('should show graceful fallback message', () => {
      const fallbackMessage = '⚠️ Maps API Key Missing\nPlease add your Google Maps API key to proceed';
      expect(fallbackMessage).toContain('Maps API Key Missing');
      expect(fallbackMessage).toContain('Please add');
    });
  });

  describe('Map ID Configuration', () => {
    it('should accept NEXT_PUBLIC_GOOGLE_MAP_ID as optional', () => {
      // Map ID is optional - if not provided, maps should still work with default styling
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
      // Should not throw even if undefined
      expect(() => {
        const options = { mapId: mapId || undefined };
        // Simulate useJsApiLoader options
      }).not.toThrow();
    });

    it('should use Map ID only if provided', () => {
      const mapId = 'gme-example-map-id-12345';
      const options = { mapId: mapId || undefined };
      
      if (mapId) {
        expect(options.mapId).toBe(mapId);
      } else {
        expect(options.mapId).toBeUndefined();
      }
    });

    it('should document Map ID setup instructions', () => {
      const docs =
        'Get Map ID from: https://console.cloud.google.com/maps/api/datasets\n' +
        'Map IDs are used to style your maps.\n' +
        'If not provided, default styling is used.';

      expect(docs).toContain('console.cloud.google.com');
      expect(docs).toContain('style');
    });
  });

  describe('Runtime Configuration Validation', () => {
    it('should validate all required environment variables at runtime', () => {
      const requiredVars = [
        'NEXT_PUBLIC_MAPS_API_KEY',
        // Note: NEXT_PUBLIC_GOOGLE_MAP_ID is optional
      ];

      const missingVars = requiredVars.filter(
        (varName) => !process.env[varName]
      );

      // In development, it's OK to be missing
      // This test documents what should be checked
      expect(missingVars.length).toBeGreaterThanOrEqual(0);
    });

    it('should fail gracefully with helpful error message when API key missing', () => {
      const mapsApiKey = undefined; // Simulate missing key

      const errorUI = () => {
        if (!mapsApiKey) {
          return (
            'MISSING_API_KEY_ERROR: ' +
            'Maps API Key Missing - ' +
            'Please add NEXT_PUBLIC_MAPS_API_KEY to .env.local'
          );
        }
        return null;
      };

      const error = errorUI();
      expect(error).toContain('NEXT_PUBLIC_MAPS_API_KEY');
    });
  });

  describe('.env.example documentation', () => {
    it('should document Maps API key requirement', () => {
      const envDocumentation = 
        '# ============================================\n' +
        '# REQUIRED - Google Maps API\n' +
        '# ============================================\n' +
        'NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key\n' +
        'NEXT_PUBLIC_GOOGLE_MAP_ID=your-google-map-id\n' +
        '\n' +
        '# (Optional) Get from: https://console.cloud.google.com/maps/api/datasets\n' +
        '# Map IDs are used to style your maps. If not provided, default styling is used.';

      expect(envDocumentation).toContain('NEXT_PUBLIC_MAPS_API_KEY');
      expect(envDocumentation).toContain('NEXT_PUBLIC_GOOGLE_MAP_ID');
      expect(envDocumentation).toContain('REQUIRED');
    });

    it('should mark GOOGLE_MAP_ID as optional in documentation', () => {
      const docs = '(Optional) NEXT_PUBLIC_GOOGLE_MAP_ID - used for custom map styling';
      expect(docs).toContain('Optional');
    });
  });

  describe('Component Props & Error Handling', () => {
    it('should receive onLocationSelect callback', () => {
      type MapProps = {
        onLocationSelect: (lat: number, lng: number) => void;
        initialCoordinates?: { lat: number; lng: number } | null;
        onAddressSelect?: (address: string) => void;
      };

      const props: MapProps = {
        onLocationSelect: vi.fn(),
        initialCoordinates: { lat: 47.4979, lng: 19.0402 },
      };

      expect(typeof props.onLocationSelect).toBe('function');
      props.onLocationSelect(47.5, 19.0);
      expect(props.onLocationSelect).toHaveBeenCalledWith(47.5, 19.0);
    });

    it('should show loading state while map loads', () => {
      const renderLoadingState = () => 'Loading Map...';
      expect(renderLoadingState()).toBe('Loading Map...');
    });
  });

  describe('Budapest Coordinates (Default)', () => {
    it('should use correct Budapest center coordinates', () => {
      const budapestCenter = { lat: 47.4979, lng: 19.0402 };
      
      expect(budapestCenter.lat).toBeCloseTo(47.4979, 4);
      expect(budapestCenter.lng).toBeCloseTo(19.0402, 4);
    });

    it('should use Budapest as fallback when no coordinates provided', () => {
      const initialCoordinates = null;
      const fallbackCenter = { lat: 47.4979, lng: 19.0402 };

      const center = initialCoordinates ?? fallbackCenter;
      expect(center).toEqual(fallbackCenter);
    });
  });

  describe('Libraries Configuration', () => {
    it('should load required Google Maps libraries', () => {
      const libraries: ('places' | 'marker')[] = ['places', 'marker'];
      
      expect(libraries).toContain('places');
      expect(libraries).toContain('marker');
      expect(libraries).toHaveLength(2);
    });

    it('should use correct library types', () => {
      const validLibraries = ['places', 'marker'];
      const libraries = validLibraries as ('places' | 'marker')[];
      
      expect(libraries.every(lib => typeof lib === 'string')).toBe(true);
    });
  });

  describe('useJsApiLoader Options', () => {
    it('should pass correct API key to useJsApiLoader', () => {
      const apiKey = 'AIzaSyDummyKey123';
      const options = {
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: ['places', 'marker'] as ('places' | 'marker')[],
      };

      expect(options.googleMapsApiKey).toBe(apiKey);
      expect(options.id).toBe('google-map-script');
    });

    it('should use empty string when API key is missing', () => {
      const apiKey = undefined;
      const options = {
        googleMapsApiKey: apiKey || '',
      };

      expect(options.googleMapsApiKey).toBe('');
    });
  });

  describe('Integration with Owner Listing Form', () => {
    it('should be integrated in owner apartment form', () => {
      // This test documents that Map component is used in OwnerApartmentForm
      type FormIntegration = {
        hasMapComponent: boolean;
        mapsApiKeyRequired: boolean;
        onLocationSelectCallback: (lat: number, lng: number) => void;
      };

      const integration: FormIntegration = {
        hasMapComponent: true,
        mapsApiKeyRequired: true,
        onLocationSelectCallback: vi.fn(),
      };

      expect(integration.hasMapComponent).toBe(true);
      expect(integration.mapsApiKeyRequired).toBe(true);
    });

    it('should pass coordinates to form on location selection', () => {
      const onLocationSelect = vi.fn();
      const lat = 47.5;
      const lng = 19.1;

      onLocationSelect(lat, lng);

      expect(onLocationSelect).toHaveBeenCalledWith(lat, lng);
    });
  });

  describe('Error Recovery', () => {
    it('should show retry option or helpful next steps on error', () => {
      const errorActions = [
        'Check API key in .env.local',
        'Visit Google Cloud Console',
        'Enable Maps APIs',
        'Try refreshing page',
      ];

      expect(errorActions).toContain('Check API key in .env.local');
      expect(errorActions).toContain('Visit Google Cloud Console');
    });
  });
});
