'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import ApartmentComparison from '../../components/ApartmentComparison';
import Link from 'next/link';

export default function ComparePage() {
  const [savedApartments, setSavedApartments] = useState<any[]>([]);
  const [selectedApartments, setSelectedApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          // Load user's saved apartments
          const { data: favorites } = await supabase
            .from('favorites')
            .select(`
              id,
              created_at,
              apartments (
                id,
                title,
                price_huf,
                district,
                bedrooms,
                bathrooms,
                size_sqm,
                image_urls,
                address,
                description
              )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

          if (favorites) {
            const apartments = favorites.map(fav => fav.apartments).filter(Boolean);
            setSavedApartments(apartments);
          }
        }
      } catch (error) {
        console.error('Error loading favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndFavorites();
  }, []);

  const toggleApartmentSelection = (apartment: any) => {
    setSelectedApartments(prev => {
      const isSelected = prev.some(apt => apt.id === apartment.id);
      if (isSelected) {
        return prev.filter(apt => apt.id !== apartment.id);
      } else if (prev.length < 4) { // Limit to 4 apartments for comparison
        return [...prev, apartment];
      }
      return prev;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-6">You need to be signed in to compare apartments</p>
          <Link href="/login" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (savedApartments.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Saved Apartments</h1>
          <p className="text-gray-600 mb-6">Save some apartments to compare them</p>
          <Link href="/apartments" className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition">
            Browse Apartments
          </Link>
        </div>
      </div>
    );
  }

  if (selectedApartments.length < 2) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <Link href="/apartments" className="text-blue-600 hover:underline">
              &larr; Back to apartments
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Compare Apartments</h1>
            <p className="text-gray-600 mb-6">
              Select 2-4 apartments from your saved list to compare them side by side
            </p>
            <div className="text-sm text-gray-500 mb-4">
              Selected: {selectedApartments.length} apartment{selectedApartments.length !== 1 ? 's' : ''}
              {selectedApartments.length < 2 && ' (select at least 2 to compare)'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedApartments.map((apartment) => {
              const isSelected = selectedApartments.some(apt => apt.id === apartment.id);
              return (
                <div
                  key={apartment.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:shadow-lg'
                  }`}
                  onClick={() => toggleApartmentSelection(apartment)}
                >
                  <div className="relative h-48 bg-gray-200">
                    {apartment.image_urls && apartment.image_urls[0] ? (
                      <img
                        src={apartment.image_urls[0]}
                        alt={apartment.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-4xl">🏠</span>
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">{apartment.title}</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      📍 District {apartment.district} • 🛏️ {apartment.bedrooms} beds
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-orange-600">
                        {apartment.price_huf?.toLocaleString()} Ft
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        isSelected ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isSelected ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedApartments.length >= 2 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setSelectedApartments(selectedApartments)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition"
              >
                Compare {selectedApartments.length} Apartments
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/compare" className="text-blue-600 hover:underline">
            ← Back to selection
          </Link>
          <button
            onClick={() => setSelectedApartments([])}
            className="text-gray-600 hover:text-gray-800 underline"
          >
            Change selection
          </button>
        </div>

        <ApartmentComparison initialApartments={selectedApartments} />
      </div>
    </div>
  );
}