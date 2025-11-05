import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DEFAULT_FALLBACK_MESSAGE, DEFAULT_MAP_LIBRARIES } from '@/lib/maps/config';
import ApartmentLocationMap from '@/components/ApartmentLocationMap';

const { mockUseJsApiLoader } = vi.hoisted(() => ({
  mockUseJsApiLoader: vi.fn(),
}));

vi.mock('@react-google-maps/api', () => {
  const React = require('react') as typeof import('react');
  return {
    GoogleMap: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'google-map' }, children),
    Marker: () => null,
    useJsApiLoader: mockUseJsApiLoader,
  };
});

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
  mockUseJsApiLoader.mockReset();
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

describe('ApartmentLocationMap', () => {
  const defaultProps = {
    latitude: 47.4979,
    longitude: 19.0402,
    address: 'Budapest, Hungary',
    title: 'Test Apartment',
  };

  it('renders fallback message when API key is missing', () => {
    setEnv({ NEXT_PUBLIC_MAPS_API_KEY: undefined });
    mockUseJsApiLoader.mockReturnValue({ isLoaded: false, loadError: undefined });

    render(<ApartmentLocationMap {...defaultProps} />);

    const fallback = screen.getByTestId('maps-fallback');
  expect(fallback).toBeTruthy();
  const [fallbackHeadline] = DEFAULT_FALLBACK_MESSAGE.split('\n');
  expect(fallback.textContent).toContain(fallbackHeadline);
  expect(fallback.textContent).toContain('NEXT_PUBLIC_MAPS_API_KEY');
  });

  it('passes config to useJsApiLoader when API key is available', () => {
    setEnv({
      NEXT_PUBLIC_MAPS_API_KEY: 'AIzaSyComponentTestKeyForMaps123456789',
      NEXT_PUBLIC_GOOGLE_MAP_ID: 'gme-apartment-map-id',
    });
    mockUseJsApiLoader.mockReturnValue({ isLoaded: true, loadError: undefined });

    render(<ApartmentLocationMap {...defaultProps} />);

  expect(screen.queryByTestId('maps-fallback')).toBeNull();
  expect(screen.getByTestId('google-map')).toBeTruthy();

    expect(mockUseJsApiLoader).toHaveBeenCalledTimes(1);
    expect(mockUseJsApiLoader).toHaveBeenCalledWith({
      id: 'google-map-script',
      googleMapsApiKey: 'AIzaSyComponentTestKeyForMaps123456789',
      libraries: [...DEFAULT_MAP_LIBRARIES],
      mapIds: ['gme-apartment-map-id'],
    });
  });
});
