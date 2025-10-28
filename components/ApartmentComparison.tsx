'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, Star, MapPin, Bed, Bath, Square, Calendar, DollarSign, Wifi, Car, PawPrint, Home } from 'lucide-react';
import { supabase } from '@/utils/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { FocusTrap } from './ui/FocusTrap';
import { useAccessibility } from './AccessibilityProvider';

interface Apartment {
  id: string;
  title: string;
  price_huf: number;
  image_urls: string[];
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  address: string;
  district: number;
  description: string;
  owner_rating?: number;
  floor_number?: number;
  furnishing?: string;
  created_at: string;
}

interface ApartmentComparisonProps {
  initialApartments?: Apartment[];
  onClose?: () => void;
}

export default function ApartmentComparison({ initialApartments = [], onClose }: ApartmentComparisonProps) {
  const [apartments, setApartments] = useState<Apartment[]>(initialApartments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchResults, setSearchResults] = useState<Apartment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { announce } = useAccessibility();
  const modalRef = useRef<HTMLDivElement>(null);

  // Load apartments if none provided
  useEffect(() => {
    if (apartments.length === 0) {
      loadRecentApartments();
    }
  }, [apartments.length]);

  // Announce when modal opens
  useEffect(() => {
    if (showAddModal) {
      announce('Add apartment modal opened');
    }
  }, [showAddModal, announce]);

  const loadRecentApartments = async () => {
    const { data } = await supabase
      .from('apartments')
      .select('*')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(6);

    if (data) {
      setApartments(data.slice(0, 3)); // Start with 3 apartments
    }
  };

  const searchApartments = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('apartments')
      .select('*')
      .eq('is_available', true)
      .ilike('title', `%${query}%`)
      .limit(10);

    setSearchResults(data || []);
  };

  const addApartment = (apartment: Apartment) => {
    if (apartments.length < 4 && !apartments.find(a => a.id === apartment.id)) {
      setApartments([...apartments, apartment]);
    }
    setShowAddModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeApartment = (apartmentId: string) => {
    setApartments(apartments.filter(a => a.id !== apartmentId));
  };

  const getBestValue = (apartments: Apartment[], field: keyof Apartment) => {
    if (field === 'price_huf') {
      return Math.min(...apartments.map(a => a[field] as number || 0));
    }
    if (field === 'size_sqm' || field === 'bedrooms' || field === 'bathrooms') {
      return Math.max(...apartments.map(a => a[field] as number || 0));
    }
    return null;
  };

  const isBestValue = (apartment: Apartment, field: keyof Apartment, bestValue: any) => {
    if (field === 'price_huf') {
      return (apartment[field] as number || 0) === bestValue;
    }
    if (field === 'size_sqm' || field === 'bedrooms' || field === 'bathrooms') {
      return (apartment[field] as number || 0) === bestValue;
    }
    return false;
  };

  if (apartments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No apartments to compare</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Apartments
          </button>
        </div>
      </div>
    );
  }

  return (
    <FocusTrap isActive={showAddModal}>
      <div
        className="bg-white rounded-xl shadow-lg overflow-hidden"
        role="region"
        aria-labelledby="comparison-title"
        aria-describedby="comparison-description"
      >
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
          <h2
            id="comparison-title"
            className="text-xl font-bold text-gray-900"
          >
            Compare Apartments
          </h2>
          <p id="comparison-description" className="sr-only">
            Compare up to 4 apartments side by side to find your perfect match
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              disabled={apartments.length >= 4}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Add apartment to comparison (${apartments.length}/4 selected)`}
              aria-disabled={apartments.length >= 4}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                aria-label="Close apartment comparison"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

      {/* Comparison Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Images Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex-shrink-0">
              <span className="font-semibold text-gray-700">Apartments</span>
            </div>
            {apartments.map((apartment) => (
              <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r relative">
                <button
                  onClick={() => removeApartment(apartment.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                  <Image
                    src={apartment.image_urls?.[0] || '/placeholder-apartment.jpg'}
                    alt={apartment.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">{apartment.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{apartment.address || `District ${apartment.district}`}</p>
                <Link
                  href={`/apartments/${apartment.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Details →
                </Link>
              </div>
            ))}
          </div>

          {/* Price Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-gray-700">Price</span>
            </div>
            {apartments.map((apartment) => {
              const bestPrice = getBestValue(apartments, 'price_huf');
              const isBest = isBestValue(apartment, 'price_huf', bestPrice);
              return (
                <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                  <div className={`text-lg font-bold ${isBest ? 'text-green-600' : 'text-gray-900'}`}>
                    {(apartment.price_huf || 0).toLocaleString()} Ft
                  </div>
                  <div className="text-sm text-gray-500">per month</div>
                  {isBest && <div className="text-xs text-green-600 font-medium mt-1">Best Value</div>}
                </div>
              );
            })}
          </div>

          {/* Bedrooms Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Bed className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-700">Bedrooms</span>
            </div>
            {apartments.map((apartment) => {
              const bestBedrooms = getBestValue(apartments, 'bedrooms');
              const isBest = isBestValue(apartment, 'bedrooms', bestBedrooms);
              return (
                <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                  <div className={`text-lg font-bold ${isBest ? 'text-blue-600' : 'text-gray-900'}`}>
                    {apartment.bedrooms || 0}
                  </div>
                  {isBest && <div className="text-xs text-blue-600 font-medium mt-1">Most Spacious</div>}
                </div>
              );
            })}
          </div>

          {/* Bathrooms Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Bath className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-700">Bathrooms</span>
            </div>
            {apartments.map((apartment) => {
              const bestBathrooms = getBestValue(apartments, 'bathrooms');
              const isBest = isBestValue(apartment, 'bathrooms', bestBathrooms);
              return (
                <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                  <div className={`text-lg font-bold ${isBest ? 'text-blue-600' : 'text-gray-900'}`}>
                    {apartment.bathrooms || 0}
                  </div>
                  {isBest && <div className="text-xs text-blue-600 font-medium mt-1">Most Bathrooms</div>}
                </div>
              );
            })}
          </div>

          {/* Size Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Square className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-gray-700">Size</span>
            </div>
            {apartments.map((apartment) => {
              const bestSize = getBestValue(apartments, 'size_sqm');
              const isBest = isBestValue(apartment, 'size_sqm', bestSize);
              return (
                <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                  <div className={`text-lg font-bold ${isBest ? 'text-purple-600' : 'text-gray-900'}`}>
                    {apartment.size_sqm || 0} m²
                  </div>
                  {isBest && <div className="text-xs text-purple-600 font-medium mt-1">Largest</div>}
                </div>
              );
            })}
          </div>

          {/* Floor Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Home className="w-4 h-4 text-orange-600" />
              <span className="font-semibold text-gray-700">Floor</span>
            </div>
            {apartments.map((apartment) => (
              <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                <div className="text-lg font-bold text-gray-900">
                  {apartment.floor_number || 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {/* Furnishing Row */}
          <div className="flex border-b">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Home className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold text-gray-700">Furnishing</span>
            </div>
            {apartments.map((apartment) => (
              <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                <div className="text-lg font-bold text-gray-900 capitalize">
                  {apartment.furnishing || 'Not specified'}
                </div>
              </div>
            ))}
          </div>

          {/* Rating Row */}
          <div className="flex">
            <div className="w-48 p-4 bg-gray-50 border-r flex items-center gap-2 flex-shrink-0">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-gray-700">Owner Rating</span>
            </div>
            {apartments.map((apartment) => (
              <div key={apartment.id} className="flex-1 min-w-80 p-4 border-r">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-lg font-bold text-gray-900">
                    {apartment.owner_rating ? apartment.owner_rating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Apartment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Add Apartment to Compare</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search apartments..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchApartments(e.target.value);
                }}
                className="mt-4 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="p-6 overflow-y-auto max-h-96">
              {searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((apartment) => (
                    <div key={apartment.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                      <img
                        src={apartment.image_urls?.[0] || '/placeholder-apartment.jpg'}
                        alt={apartment.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{apartment.title}</h4>
                        <p className="text-sm text-gray-600">{apartment.price_huf?.toLocaleString()} Ft</p>
                        <p className="text-xs text-gray-500">{apartment.address || `District ${apartment.district}`}</p>
                      </div>
                      <button
                        onClick={() => addApartment(apartment)}
                        disabled={!!apartments.find(a => a.id === apartment.id) || apartments.length >= 4}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        {apartments.find(a => a.id === apartment.id) ? 'Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <p className="text-gray-500 text-center py-8">No apartments found</p>
              ) : (
                <p className="text-gray-500 text-center py-8">Start typing to search apartments</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </FocusTrap>
  );
}