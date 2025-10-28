'use client';

import React from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

interface ApartmentLocationMapProps {
  latitude: number;
  longitude: number;
  address: string;
  title: string;
}

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px',
};

export default function ApartmentLocationMap({
  latitude,
  longitude,
  address,
  title
}: ApartmentLocationMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_Maps_API_KEY || '',
  });

  if (!isLoaded) {
    return (
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  const center = {
    lat: latitude,
    lng: longitude,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">Location</h3>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          <Marker
            position={center}
            title={title}
          />
        </GoogleMap>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Address:</span> {address}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Click on the marker to see the apartment location on Google Maps
        </p>
      </div>
    </div>
  );
}