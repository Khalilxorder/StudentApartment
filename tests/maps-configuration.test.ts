import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  DEFAULT_FALLBACK_MESSAGE,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_LIBRARIES,
  getMapsConfig,
} from '@/lib/maps/config';

const originalEnv: Record<string, string | undefined> = { ...process.env };
const mutatedEnvKeys = new Set<string>();

function setEnv(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    mutatedEnvKeys.add(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
  setEnv({ NEXT_PUBLIC_Maps_API_KEY: undefined });
});

afterEach(() => {
  for (const key of mutatedEnvKeys) {
    const originalValue = originalEnv[key];
    if (originalValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalValue;
    }
  }
  mutatedEnvKeys.clear();
});

const createLogger = () => ({
  warn: vi.fn(),
  error: vi.fn(),
});

describe('getMapsConfig', () => {
  it('returns config with defaults when API key is present', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: 'AIzaSyValidKey123456789012345678901',
      NEXT_PUBLIC_GOOGLE_MAP_ID: 'gme-custom-map-id',
    });

    const result = getMapsConfig({ silent: true });
    expect(result.apiKey).toBe('AIzaSyValidKey123456789012345678901');
    expect(result.mapId).toBe('gme-custom-map-id');
    expect(result.defaultCenter).toBe(DEFAULT_MAP_CENTER);
    expect(result.fallbackMessage).toBe(DEFAULT_FALLBACK_MESSAGE);
    expect(result.libraries).toEqual(DEFAULT_MAP_LIBRARIES);
    expect(result.libraries).not.toBe(DEFAULT_MAP_LIBRARIES); // defensive copy
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.hasErrors).toBe(false);
  });

  it('flags missing API key as error when required', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: undefined,
      NODE_ENV: 'production',
    });
    const logger = createLogger();

  const result = getMapsConfig({ logger, requireApiKey: true });

    expect(result.hasErrors).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('NEXT_PUBLIC_MAPS_API_KEY');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('NEXT_PUBLIC_MAPS_API_KEY'));
  });

  it('downgrades missing API key to warning when not required', () => {
    setEnv({ NEXT_PUBLIC_MAPS_API_KEY: undefined });
    const logger = createLogger();

    const result = getMapsConfig({ requireApiKey: false, logger });

    expect(result.hasErrors).toBe(false);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings[0]).toContain('NEXT_PUBLIC_MAPS_API_KEY');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('NEXT_PUBLIC_MAPS_API_KEY'));
  });

  it('treats empty string API key as missing', () => {
    setEnv({ NEXT_PUBLIC_MAPS_API_KEY: '' });

    const result = getMapsConfig({ requireApiKey: false, silent: true });

    expect(result.apiKey).toBe('');
    expect(result.warnings[0]).toContain('NEXT_PUBLIC_MAPS_API_KEY');
  });

  it('emits warning when incorrectly cased env var is present', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: undefined,
      NEXT_PUBLIC_Maps_API_KEY: 'AIzaWrongCaseKey',
    });

    const result = getMapsConfig({ requireApiKey: false, silent: true });

    expect(result.warnings.some((warning) => warning.includes('uppercase MAPS'))).toBe(true);
  });

  it('warns when API key does not match expected format', () => {
    setEnv({ NEXT_PUBLIC_MAPS_API_KEY: 'not-a-valid-key' });
    const result = getMapsConfig({ requireApiKey: false, silent: true });

    expect(
      result.warnings.some((warning) =>
        warning.includes('Google Maps API keys usually start with')
      )
    ).toBe(true);
  });

  it('warns when map id value is suspiciously short', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: 'AIzaSyValidKey123456789012345678901',
      NEXT_PUBLIC_GOOGLE_MAP_ID: '123',
    });

    const result = getMapsConfig({ silent: true });

    expect(result.warnings.some((warning) => warning.includes('Map ID'))).toBe(true);
  });

  it('trims whitespace around env values', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: '  AIzaSyValidKey123456789012345678901  ',
      NEXT_PUBLIC_GOOGLE_MAP_ID: '  gme-trimmed-id  ',
    });

    const result = getMapsConfig({ silent: true });

    expect(result.apiKey).toBe('AIzaSyValidKey123456789012345678901');
    expect(result.mapId).toBe('gme-trimmed-id');
  });

  it('logs both warnings and errors through the provided logger', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: undefined,
      NEXT_PUBLIC_Maps_API_KEY: 'legacy-key',
      NODE_ENV: 'production',
    });
    const logger = createLogger();

  const result = getMapsConfig({ logger, requireApiKey: true });

    expect(result.hasErrors).toBe(true);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
