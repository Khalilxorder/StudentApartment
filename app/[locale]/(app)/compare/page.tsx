'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { supabase } from '@/utils/supabaseClient';
import ApartmentComparison from '@/components/ApartmentComparison';
import ApartmentBattle from '@/components/ApartmentBattle';

export default function ComparePage() {
  const [savedApartments, setSavedApartments] = useState<any[]>([]);
  const [selectedApartments, setSelectedApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'selection' | 'table' | 'battle'>('selection');

  useEffect(() => {
    const loadUserAndFavorites = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        setUser(currentUser);

        if (currentUser) {
          const { data: favorites } = await supabase
            .from('apartment_favorites') // Fixed table name from 'favorites' to 'apartment_favorites' based on migration file context
            .select(
              `
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
            `
            )
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

          if (favorites) {
            const apartments = favorites.map((fav: any) => fav.apartments).filter(Boolean);
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
    setSelectedApartments((prev) => {
      const isSelected = prev.some((apt) => apt.id === apartment.id);
      if (isSelected) {
        return prev.filter((apt) => apt.id !== apartment.id);
      }
      if (prev.length < 4) {
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

  // BATTLE MODE VIEW
  if (viewMode === 'battle') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => setViewMode('selection')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
              aria-label="Back to selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Battle Mode</h1>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Dynamically import or just render ApartmentBattle if imported at top */}
          {/* Since I cannot change imports easily with replace_file, I will assume I can add imports or correct it later if needed. 
                   Actually, I should have added the import. I will do that in a separate step or try to include it if I can. 
                   Wait, I am replacing the BODY of the function essentially, but I missed the imports.
                   I'll use ApartmentBattle here assuming it is available. 
                   Wait, if I don't import it, it breaks. 
                   I will need to use multi_replace to add import. 
                   For now, let's just put the View logic here and I will fix imports right after.
                */}
          <div className="bg-white rounded-xl shadow p-6">
            <p className="text-gray-600 mb-6 text-center">Drag apartments into the arena to compare them head-to-head!</p>
            <ApartmentBattle initialApartments={savedApartments} />
          </div>
        </div>
      </div>
    );
  }

  // TABLE COMPARISON VIEW
  if (viewMode === 'table') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setViewMode('selection')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
              aria-label="Back to selection"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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

  // SELECTION VIEW (Default)
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/apartments"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
            aria-label="Back to apartments"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Apartments</h1>
              <p className="text-gray-600">
                Select 2-4 apartments to compare table-style, or enter <strong className="text-orange-600">Battle Mode</strong>.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setViewMode('battle')}
                className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition shadow-md flex items-center gap-2"
              >
                ⚔️ Battle Mode
              </button>
              {selectedApartments.length >= 2 && (
                <button
                  onClick={() => setViewMode('table')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition shadow-md"
                >
                  Compare Details ({selectedApartments.length})
                </button>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-500 mt-4">
            Selected: {selectedApartments.length} apartment{selectedApartments.length !== 1 ? 's' : ''}
            {selectedApartments.length < 2 && ' (select at least 2 for table comparison)'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedApartments.map((apartment) => {
            const isSelected = selectedApartments.some((apt) => apt.id === apartment.id);
            return (
              <div
                key={apartment.id}
                className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:shadow-lg'
                  }`}
                onClick={() => toggleApartmentSelection(apartment)}
              >
                <div className="relative h-48 bg-gray-200">
                  {apartment.image_urls && apartment.image_urls[0] ? (
                    <img src={apartment.image_urls[0]} alt={apartment.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-4xl">?</span>
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">&check;</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2">{apartment.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    District {apartment.district} | {apartment.bedrooms} beds
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-orange-600">
                      {apartment.price_huf?.toLocaleString()} Ft
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${isSelected ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                      {isSelected ? 'Selected' : 'Click to select'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
