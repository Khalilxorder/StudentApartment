'use client';

import { useState, useCallback, useRef, Fragment, useEffect } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption, Transition } from '@headlessui/react';

const containerStyle = {
  width: '100%',
  height: '300px'
};

const budapestCenter = {
  lat: 47.4979,
  lng: 19.0402
};

const libraries: ("places" | "marker")[] = ["places", "marker"];

type Coordinates = { lat: number; lng: number };

export default function Map({
  onLocationSelect,
  initialCoordinates,
  onAddressSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  initialCoordinates?: Coordinates | null;
  onAddressSelect?: (address: string) => void;
}) {
  const mapsApiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY;
  
  // Runtime validation for Maps API key
  if (!mapsApiKey) {
    console.error(
      'MISSING REQUIRED ENV VAR: NEXT_PUBLIC_MAPS_API_KEY\n' +
      'Please add it to your .env.local file:\n' +
      'NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key\n' +
      'Get it from: https://console.cloud.google.com/apis/credentials'
    );
  }

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey || '',
    libraries,
  });

  const [marker, setMarker] = useState<Coordinates>(initialCoordinates ?? budapestCenter);
  const mapRef = useRef<google.maps.Map | null>(null);
  const advancedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const panTo = useCallback(({ lat, lng }: { lat: number, lng: number }) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat, lng });
      mapRef.current.setZoom(14);
    }
    setMarker({ lat, lng });
    onLocationSelect(lat, lng);
  }, [onLocationSelect]);

  useEffect(() => {
    if (!initialCoordinates) {
      return;
    }

    const sameLocation =
      Math.abs(initialCoordinates.lat - marker.lat) < 1e-6 &&
      Math.abs(initialCoordinates.lng - marker.lng) < 1e-6;

    if (sameLocation) {
      return;
    }

    setMarker(initialCoordinates);
    onLocationSelect(initialCoordinates.lat, initialCoordinates.lng);
  }, [initialCoordinates, marker, onLocationSelect]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.panTo(marker);
    if (mapRef.current.getZoom() !== 14) {
      mapRef.current.setZoom(14);
    }
  }, [marker]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) {
      return;
    }

    const { AdvancedMarkerElement } = google.maps.marker;

    if (!advancedMarkerRef.current) {
      advancedMarkerRef.current = new AdvancedMarkerElement({
        map: mapRef.current,
        position: marker,
        title: 'Apartment Location',
      });
      return;
    }

    advancedMarkerRef.current.position = marker;
  }, [isLoaded, marker]);

  // Error handling for missing API key or load failure
  if (loadError) {
    return (
      <div className="w-full h-[300px] bg-red-50 border border-red-200 rounded-lg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">❌ Maps Failed to Load</p>
          <p className="text-red-500 text-sm">
            {loadError.message || 'Unknown error loading Google Maps API'}
          </p>
          <p className="text-red-500 text-xs mt-2">
            Check your NEXT_PUBLIC_MAPS_API_KEY in .env.local
          </p>
        </div>
      </div>
    );
  }

  if (!mapsApiKey) {
    return (
      <div className="w-full h-[300px] bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-yellow-700 font-semibold mb-2">⚠️ Maps API Key Missing</p>
          <p className="text-yellow-600 text-sm mb-2">
            Please add your Google Maps API key to proceed
          </p>
          <code className="text-xs bg-yellow-100 p-2 rounded block mb-2">
            NEXT_PUBLIC_MAPS_API_KEY=your-key-here
          </code>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline text-sm"
          >
            Get API Key →
          </a>
        </div>
      </div>
    );
  }

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div data-testid="map-container">
      <PlacesAutocomplete panTo={panTo} onAddressSelect={onAddressSelect} />
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={marker}
        zoom={12}
        onLoad={onMapLoad}
        options={{
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || undefined,
        }}
        onClick={(e) => {
          if (e.latLng) {
            panTo({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        }}
      />
    </div>
  );
}

function PlacesAutocomplete({
  panTo,
  onAddressSelect,
}: {
  panTo: ({ lat, lng }: { lat: number; lng: number }) => void;
  onAddressSelect?: (address: string) => void;
}) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ description: string, placeId: string }[]>([]);

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    if (!e.target.value) return;

    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: e.target.value }, (results, status) => {
      if (!results) {
        setSuggestions([]);
        return;
      }
      const mapped = results
        .map((item) => ({ description: item.description ?? '', placeId: item.place_id ?? '' }))
        .filter((s) => s.description && s.placeId);
      setSuggestions(mapped);
    });
  };

  const handleSelect = (address: string | null) => {
    if (!address) return;
    
    setValue(address);
    setSuggestions([]);
    onAddressSelect?.(address);

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        panTo({ lat: location.lat(), lng: location.lng() });
        onAddressSelect?.(results[0].formatted_address ?? address);
      }
    });
  };

  return (
    <div className="relative">
      <Combobox value={value} onChange={handleSelect}>
        <ComboboxInput
          className="w-full p-2 mb-2 border rounded-md shadow-sm"
          displayValue={(item: string) => item}
          onChange={handleInput}
          placeholder="Search for an address..."
        />
        <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
          <ComboboxOptions className="absolute z-10 w-full bg-white border rounded-md shadow-lg py-1 mt-1 max-h-60 overflow-auto focus:outline-none">
            {suggestions.map(({ placeId, description }) => (
              <ComboboxOption
                key={placeId}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`
                }
                value={description}
              >
                {({ selected, active }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{description}</span>
                    {selected && (
                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-blue-600' : 'text-blue-600'}`}>✓</span>
                    )}
                  </>
                )}
              </ComboboxOption>
            ))}
            {suggestions.length === 0 && (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                No results found.
              </div>
            )}
          </ComboboxOptions>
        </Transition>
      </Combobox>
    </div>
  );
}


