'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Check, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';

interface Apartment {
  id: string;
  title: string;
  price_huf: number;
  district: number;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  image_urls: string[];
  address?: string;
}

interface CompareDrawerProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function CompareDrawer({ isOpen: controlledIsOpen, onToggle }: CompareDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const toggleOpen = onToggle ?? (() => setInternalIsOpen(!internalIsOpen));

  // Load saved apartments from favorites
  useEffect(() => {
    const loadSavedApartments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: favorites } = await supabase
          .from('apartment_favorites')
          .select(`
            apartments (
              id,
              title,
              price_huf,
              district,
              bedrooms,
              bathrooms,
              size_sqm,
              image_urls,
              address
            )
          `)
          .eq('user_id', user.id)
          .limit(4);

        if (favorites) {
          const apts = favorites
            .map((f: any) => f.apartments)
            .filter(Boolean) as Apartment[];
          setApartments(apts);
        }
      } catch (error) {
        console.error('Error loading saved apartments:', error);
      }
    };

    loadSavedApartments();
  }, []);

  const removeApartment = async (apartmentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('apartment_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('apartment_id', apartmentId);

      setApartments(prev => prev.filter(a => a.id !== apartmentId));
    } catch (error) {
      console.error('Error removing apartment:', error);
    }
  };

  const getBestValue = (field: keyof Apartment): string | null => {
    if (apartments.length < 2) return null;

    const values = apartments.map(a => ({
      id: a.id,
      value: a[field] as number,
    })).filter(v => v.value !== undefined && v.value !== null);

    if (values.length === 0) return null;

    if (field === 'price_huf') {
      const min = Math.min(...values.map(v => v.value));
      return values.find(v => v.value === min)?.id || null;
    } else {
      const max = Math.max(...values.map(v => v.value));
      return values.find(v => v.value === max)?.id || null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU').format(price);
  };

  if (apartments.length === 0) return null;

  return (
    <>
      {/* Floating Badge */}
      <button
        onClick={toggleOpen}
        className={`
          fixed bottom-4 right-4 z-40
          flex items-center gap-2 px-4 py-3
          bg-gradient-to-r from-purple-600 to-purple-700 text-white
          rounded-full shadow-lg hover:shadow-xl
          transition-all duration-300
          ${isOpen ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}
        `}
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-200" />
        </span>
        <span className="font-medium">{apartments.length} saved to compare</span>
        <ChevronUp className="h-4 w-4" />
      </button>

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-white border-t border-gray-200 shadow-2xl
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: '60vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Compare Apartments</h3>
            <span className="text-sm text-gray-500">({apartments.length}/4 selected)</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/compare"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Full Compare View
            </Link>
            <button
              onClick={toggleOpen}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="overflow-x-auto p-4">
          <div className="flex gap-4 min-w-max">
            {apartments.map((apt) => (
              <div
                key={apt.id}
                className="w-64 flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="relative h-32">
                  {apt.image_urls?.[0] ? (
                    <Image
                      src={apt.image_urls[0]}
                      alt={apt.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <button
                    onClick={() => removeApartment(apt.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 text-gray-600 hover:text-red-600 rounded-full shadow-sm hover:shadow-md transition-all"
                    title="Remove from compare"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="p-3 space-y-2">
                  <Link
                    href={`/apartments/${apt.id}`}
                    className="font-medium text-gray-900 hover:text-purple-600 line-clamp-1"
                  >
                    {apt.title}
                  </Link>

                  {/* Price */}
                  <div className={`flex items-center justify-between ${getBestValue('price_huf') === apt.id ? 'bg-green-50 -mx-3 px-3 py-1 rounded' : ''}`}>
                    <span className="text-sm text-gray-500">Price</span>
                    <span className={`font-semibold ${getBestValue('price_huf') === apt.id ? 'text-green-600' : ''}`}>
                      {formatPrice(apt.price_huf)} HUF
                      {getBestValue('price_huf') === apt.id && (
                        <Check className="inline h-4 w-4 ml-1 text-green-600" />
                      )}
                    </span>
                  </div>

                  {/* Size */}
                  <div className={`flex items-center justify-between ${getBestValue('size_sqm') === apt.id ? 'bg-green-50 -mx-3 px-3 py-1 rounded' : ''}`}>
                    <span className="text-sm text-gray-500">Size</span>
                    <span className={`font-medium ${getBestValue('size_sqm') === apt.id ? 'text-green-600' : ''}`}>
                      {apt.size_sqm} m²
                      {getBestValue('size_sqm') === apt.id && (
                        <Check className="inline h-4 w-4 ml-1 text-green-600" />
                      )}
                    </span>
                  </div>

                  {/* Bedrooms */}
                  <div className={`flex items-center justify-between ${getBestValue('bedrooms') === apt.id ? 'bg-green-50 -mx-3 px-3 py-1 rounded' : ''}`}>
                    <span className="text-sm text-gray-500">Bedrooms</span>
                    <span className={`font-medium ${getBestValue('bedrooms') === apt.id ? 'text-green-600' : ''}`}>
                      {apt.bedrooms}
                      {getBestValue('bedrooms') === apt.id && (
                        <Check className="inline h-4 w-4 ml-1 text-green-600" />
                      )}
                    </span>
                  </div>

                  {/* District */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">District</span>
                    <span className="font-medium">{apt.district}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Add More Card */}
            {apartments.length < 4 && (
              <Link
                href="/apartments"
                className="w-64 flex-shrink-0 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 h-[276px] text-gray-400 hover:text-purple-600 hover:border-purple-300 transition-colors"
              >
                <Plus className="h-8 w-8" />
                <span className="text-sm font-medium">Add more</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
