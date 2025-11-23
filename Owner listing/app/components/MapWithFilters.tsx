// FILE: app/components/MapWithFilters.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import Image from 'next/image';
import { supabase } from '@/utils/supabaseClient';

const containerStyle = {
  width: '100%',
  height: '400px',
};

const center = {
  lat: 47.4979,
  lng: 19.0402,
};

export default function MapWithFilters() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY || '',
  });
  const [apartments, setApartments] = useState<any[]>([]);
  const [minPrice, setMinPrice] = useState<number>(120000);
  const [maxPrice, setMaxPrice] = useState<number>(240000);
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(0);
  const [balconies, setBalconies] = useState<number>(0);
  const [nearbyFilters, setNearbyFilters] = useState<string[]>([]);

  useEffect(() => {
    async function fetchApartments() {
      const { data, error } = await supabase.from('apartments').select('*').eq('is_available', true);
      if (data) setApartments(data);
    }
    fetchApartments();
  }, []);

  const filtered = useMemo(() => {
    return apartments.filter((apt) => {
      const price = apt.price_huf || apt.price || 0;
      return (
        price >= minPrice &&
        price <= maxPrice &&
        (apt.bedrooms || 0) >= bedrooms &&
        (apt.bathrooms || 0) >= bathrooms &&
        (apt.balcony || 0) >= balconies &&
        (!nearbyFilters.length || (apt.neighborhood_tags && nearbyFilters.every((tag) => apt.neighborhood_tags?.includes(tag))))
      );
    });
  }, [apartments, minPrice, maxPrice, bedrooms, bathrooms, balconies, nearbyFilters]);

  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-4 items-center">
        {/* Price Range */}
        <div className="flex gap-2 items-center">
          <div className="rounded-full border px-4 py-1 text-sm bg-orange-100 text-orange-700">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              placeholder="Min"
              className="bg-transparent w-16 outline-none"
            />
          </div>
          <span>-</span>
          <div className="rounded-full border px-4 py-1 text-sm bg-orange-100 text-orange-700">
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              placeholder="Max"
              className="bg-transparent w-16 outline-none"
            />
          </div>
        </div>

{/* Room Selectors */}
{[
  { label: 'Bedroom', icon: '/icons/bedroom.png', value: bedrooms, setValue: setBedrooms },
  { label: 'Bathroom', icon: '/icons/Bathroom.svg', value: bathrooms, setValue: setBathrooms },
  { label: 'Balcony', icon: '/icons/Balcony.svg', value: balconies, setValue: setBalconies }
].map(({ label, icon, value, setValue }) => (
  <div key={label} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
    <Image src={icon} alt={label} width={20} height={20} />
    <span>{label}</span>
    <button onClick={() => setValue(Math.max(0, value - 1))}>-</button>
    <span>{value}</span>
    <button onClick={() => setValue(value + 1)}>+</button>
  </div>
))}


        {/* Close To */}
        <div className="flex items-center gap-2">
          {["Semmelweis", "Boráros tér", "European UN"].map((place) => (
            <button
              key={place}
              onClick={() => {
                setNearbyFilters((prev) =>
                  prev.includes(place)
                    ? prev.filter((x) => x !== place)
                    : [...prev, place]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm border flex items-center gap-1 ${
                nearbyFilters.includes(place)
                  ? 'bg-orange-200 text-orange-900 border-orange-400'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> {place}
            </button>
          ))}
        </div>
      </div>

      {/* Google Map */}
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={13}>
        {filtered.map((apt) => (
          <Marker key={apt.id} position={{ lat: apt.latitude ?? apt.lat, lng: apt.longitude ?? apt.lng }} />
        ))}
      </GoogleMap>

      {/* Apartment Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filtered.map((apt) => (
          <div key={apt.id} className="bg-white rounded-xl shadow hover:shadow-lg transition">
            <img src={apt.image_urls?.[0] || '/placeholder.jpg'} alt="Apartment" className="w-full h-48 object-cover rounded-t-xl" />
            <div className="p-3">
              <p className="font-bold text-lg text-brown-700">{(apt.price_huf ?? apt.price)?.toLocaleString()} HUF</p>
              <p className="text-sm text-gray-600">{apt.bedrooms} rooms, {apt.bathrooms} bath, {apt.balcony} balcony</p>
              {apt.nearby && (
                <p className="text-xs text-gray-400">Close to: {apt.nearby.join(', ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
