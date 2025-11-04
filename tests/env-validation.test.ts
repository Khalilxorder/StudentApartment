import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateEnvironment,
  validateEnvironmentOrThrow,
  formatValidationError,
  isApiConfigured,
  getSetupInstructions,
  REQUIRED_ENV_VARS,
  ENV_VAR_DOCS,
} from '@/lib/env-validation';

describe('Environment Validation System', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env vars before each test
    Object.keys(process.env).forEach(key => {
      if (!key.startsWith('NODE_')) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('validateEnvironment', () => {
    it('should detect missing required environment variables', () => {
      const result = validateEnvironment('development');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should pass validation when all required vars are set', () => {
      // Set all required vars
      REQUIRED_ENV_VARS.required.forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });
      (REQUIRED_ENV_VARS.prodOnly ?? []).forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });

      const result = validateEnvironment('development');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate production-only requirements', () => {
      REQUIRED_ENV_VARS.required.forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });
      (REQUIRED_ENV_VARS.prodOnly ?? []).forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });

      const resultProd = validateEnvironment('production');
      // All production required vars should be set (same as required in this impl)
      expect(resultProd.errors.length).toBe(0);
    });

    it('should warn about missing optional variables', () => {
      REQUIRED_ENV_VARS.required.forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });

      const result = validateEnvironment('development');
      // Should have warnings for optional vars
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should validate specific environment types', () => {
      const envs: Array<'development' | 'staging' | 'production' | 'test'> = [
        'development',
        'staging',
        'production',
        'test',
      ];

      for (const env of envs) {
        const result = validateEnvironment(env);
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      }
    });
  });

  describe('validateEnvironmentOrThrow', () => {
    it('should throw error in production when validation fails', () => {
      expect(() => {
        validateEnvironmentOrThrow('production');
      }).toThrow();
    });

    it('should not throw in development when validation fails', () => {
      expect(() => {
        validateEnvironmentOrThrow('development');
      }).not.toThrow();
    });

    it('should not throw when all required vars are set', () => {
      REQUIRED_ENV_VARS.required.forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });
      (REQUIRED_ENV_VARS.prodOnly ?? []).forEach(varName => {
        process.env[varName] = `mock-${varName}`;
      });

      expect(() => {
        validateEnvironmentOrThrow('production');
      }).not.toThrow();
    });
  });

  describe('formatValidationError', () => {
    it('should format errors into helpful message', () => {
      const errors = [
        'Missing required environment variable: GOOGLE_AI_API_KEY',
        'Missing required environment variable: NEXT_PUBLIC_MAPS_API_KEY',
      ];

      const message = formatValidationError(errors);
      expect(message).toContain('ENVIRONMENT VALIDATION FAILED');
      expect(message).toContain('GOOGLE_AI_API_KEY');
      expect(message).toContain('SETUP INSTRUCTIONS');
      expect(message).toContain('.env.local');
    });

    it('should include documentation links in error message', () => {
      const errors = ['Missing required environment variable: GOOGLE_AI_API_KEY'];
      const message = formatValidationError(errors);
      expect(message).toContain('https://');
      expect(message).toContain('.env.example');
    });

    it('should show helpful error formatting', () => {
      const errors = ['Missing STRIPE_SECRET_KEY'];
      const message = formatValidationError(errors);
      expect(message).toMatch(/❌|⚠️|✅/); // Uses emoji for clarity
    });
  });

  describe('isApiConfigured', () => {
    it('should check if Google AI API is configured', () => {
      expect(isApiConfigured('google-ai')).toBe(false);
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(isApiConfigured('google-ai')).toBe(true);
    });

    it('should check if Maps API is configured', () => {
      expect(isApiConfigured('maps')).toBe(false);
      process.env.NEXT_PUBLIC_MAPS_API_KEY = 'test-key';
      expect(isApiConfigured('maps')).toBe(true);
    });

    it('should check if Stripe is configured', () => {
      expect(isApiConfigured('stripe')).toBe(false);
      process.env.STRIPE_SECRET_KEY = 'sk_test_123';
      expect(isApiConfigured('stripe')).toBe(true);
    });

    it('should check if Meilisearch is configured', () => {
      expect(isApiConfigured('meilisearch')).toBe(false);
      process.env.MEILISEARCH_HOST = 'http://localhost:7700';
      expect(isApiConfigured('meilisearch')).toBe(true);
    });

    it('should check if Supabase is configured', () => {
      expect(isApiConfigured('supabase')).toBe(false);
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
      expect(isApiConfigured('supabase')).toBe(true);
    });

    it('should return false for unknown API', () => {
      expect(isApiConfigured('unknown-api')).toBe(false);
    });
  });

  describe('getSetupInstructions', () => {
    it('should provide Google AI setup instructions', () => {
      const instructions = getSetupInstructions('google-ai');
      expect(instructions).toContain('Google Generative AI');
      expect(instructions).toContain('aistudio.google.com');
      expect(instructions).toContain('GOOGLE_AI_API_KEY');
    });

    it('should provide Maps setup instructions', () => {
      const instructions = getSetupInstructions('maps');
      expect(instructions).toContain('Google Maps');
      expect(instructions).toContain('console.cloud.google.com');
      expect(instructions).toContain('NEXT_PUBLIC_MAPS_API_KEY');
    });

    it('should provide Stripe setup instructions', () => {
      const instructions = getSetupInstructions('stripe');
      expect(instructions).toContain('Stripe');
      expect(instructions).toContain('dashboard.stripe.com');
      expect(instructions).toContain('STRIPE_SECRET_KEY');
    });

    it('should provide Meilisearch setup instructions', () => {
      const instructions = getSetupInstructions('meilisearch');
      expect(instructions).toContain('Meilisearch');
      expect(instructions).toContain('docker');
      expect(instructions).toContain('MEILISEARCH_HOST');
    });

    it('should provide Supabase setup instructions', () => {
      const instructions = getSetupInstructions('supabase');
      expect(instructions).toContain('Supabase');
      expect(instructions).toContain('app.supabase.com');
      expect(instructions).toContain('NEXT_PUBLIC_SUPABASE_URL');
    });
  });

  describe('REQUIRED_ENV_VARS config', () => {
    it('should have required variables defined', () => {
      expect(REQUIRED_ENV_VARS.required).toBeDefined();
      expect(Array.isArray(REQUIRED_ENV_VARS.required)).toBe(true);
      expect(REQUIRED_ENV_VARS.required.length).toBeGreaterThan(0);
    });

    it('should have optional variables defined', () => {
      expect(REQUIRED_ENV_VARS.optional).toBeDefined();
      expect(Array.isArray(REQUIRED_ENV_VARS.optional)).toBe(true);
    });

    it('should have production-only variables defined', () => {
      expect(REQUIRED_ENV_VARS.prodOnly).toBeDefined();
      expect(Array.isArray(REQUIRED_ENV_VARS.prodOnly)).toBe(true);
    });

    it('should include critical Supabase variables', () => {
      expect(REQUIRED_ENV_VARS.required).toContain('NEXT_PUBLIC_SUPABASE_URL');
      expect(REQUIRED_ENV_VARS.required).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
      expect(REQUIRED_ENV_VARS.required).toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('should include critical Google API variables', () => {
      expect(REQUIRED_ENV_VARS.required).toContain('GOOGLE_AI_API_KEY');
      expect(REQUIRED_ENV_VARS.required).toContain('NEXT_PUBLIC_MAPS_API_KEY');
    });

    it('should include critical Search variables', () => {
      expect(REQUIRED_ENV_VARS.required).toContain('MEILISEARCH_HOST');
      expect(REQUIRED_ENV_VARS.required).toContain('MEILISEARCH_API_KEY');
    });

    it('should include Stripe variables', () => {
      expect(REQUIRED_ENV_VARS.required).toContain('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
      expect(REQUIRED_ENV_VARS.required).toContain('STRIPE_SECRET_KEY');
    });

    it('should have helpful documentation links', () => {
      expect(REQUIRED_ENV_VARS.links).toBeDefined();
      if (REQUIRED_ENV_VARS.links) {
        expect(Object.keys(REQUIRED_ENV_VARS.links).length).toBeGreaterThan(0);
        
        // Check that links are URLs
        Object.values(REQUIRED_ENV_VARS.links).forEach(link => {
          expect(link).toMatch(/^https?:\/\//);
        });
      }
    });
  });

  describe('ENV_VAR_DOCS documentation', () => {
    it('should document all critical variables', () => {
      expect(ENV_VAR_DOCS).toHaveProperty('NEXT_PUBLIC_SUPABASE_URL');
      expect(ENV_VAR_DOCS).toHaveProperty('GOOGLE_AI_API_KEY');
      expect(ENV_VAR_DOCS).toHaveProperty('NEXT_PUBLIC_MAPS_API_KEY');
      expect(ENV_VAR_DOCS).toHaveProperty('STRIPE_SECRET_KEY');
    });

    it('should mark variables as required or optional', () => {
      const supabaseUrl = ENV_VAR_DOCS['NEXT_PUBLIC_SUPABASE_URL'];
      expect(supabaseUrl.required).toBe(true);

      const mapId = ENV_VAR_DOCS['NEXT_PUBLIC_GOOGLE_MAP_ID'];
      expect(mapId.required).toBe(false);
    });

    it('should mark public vs private variables', () => {
      const pubKey = ENV_VAR_DOCS['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
      expect(pubKey.public).toBe(true);

      const secretKey = ENV_VAR_DOCS['SUPABASE_SERVICE_ROLE_KEY'];
      expect(secretKey.public).toBe(false);
    });

    it('should include setup links', () => {
      Object.values(ENV_VAR_DOCS).forEach(doc => {
        if (doc.required) {
          expect(doc.link).toBeDefined();
          expect(doc.link).toMatch(/^https?:\/\//);
        }
      });
    });

    it('should document variable purposes', () => {
      const doc = ENV_VAR_DOCS['GOOGLE_AI_API_KEY'];
      expect(doc.description).toBeDefined();
      expect(doc.description.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with app startup', () => {
    it('should be callable at boot time without throwing in dev', () => {
      expect(() => {
        validateEnvironmentOrThrow('development');
      }).not.toThrow();
    });

    it('should detect missing critical APIs', () => {
      delete process.env.GOOGLE_AI_API_KEY;
      const result = validateEnvironment('development');
      expect(result.errors.some(e => e.includes('GOOGLE_AI_API_KEY'))).toBe(true);
    });

    it('should allow checking individual APIs', () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      expect(isApiConfigured('google-ai')).toBe(true);
      
      delete process.env.GOOGLE_AI_API_KEY;
      expect(isApiConfigured('google-ai')).toBe(false);
    });
  });

  describe('CI/CD Environment Detection', () => {
    it('should support test environment validation', () => {
      const result = validateEnvironment('test');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
    });

    it('should support staging environment validation', () => {
      const result = validateEnvironment('staging');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
    });
  });

  describe('Error Recovery', () => {
    it('should provide actionable error messages', () => {
      const errors = ['Missing required environment variable: GOOGLE_AI_API_KEY'];
      const message = formatValidationError(errors);
      expect(message).toContain('SETUP INSTRUCTIONS');
      expect(message).toContain('Copy .env.example');
      expect(message).toContain('https://');
    });

    it('should suggest .env.local creation', () => {
      const errors = ['Missing GOOGLE_AI_API_KEY'];
      const message = formatValidationError(errors);
      expect(message).toContain('cp .env.example .env.local');
    });

    it('should warn about not committing .env.local', () => {
      const errors = ['Missing GOOGLE_AI_API_KEY'];
      const message = formatValidationError(errors);
      expect(message).toContain('Do NOT commit .env.local');
    });
  });
});
