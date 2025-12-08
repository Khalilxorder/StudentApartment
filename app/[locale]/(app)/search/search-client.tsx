'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const ChatSearch = dynamic(() => import('@/components/ChatSearch'), { ssr: false });
import { SaveApartmentButton } from '@/components/SaveApartmentButton';

interface Apartment {
  id: string;
  title: string;
  description: string;
  price_huf: number;
  district: number;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  image_urls: string[];
  aiScore?: number;
  aiReasoning?: string;
}

interface SearchFilters {
  district?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
}

export default function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>('ai');
  const [query, setQuery] = useState(searchParams?.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    district: searchParams?.get('district') || '',
    minPrice: searchParams?.get('minPrice') || '',
    maxPrice: searchParams?.get('maxPrice') || '',
    bedrooms: searchParams?.get('bedrooms') || '',
  });
  const [results, setResults] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Fetch favorites on mount
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const res = await fetch('/api/favorites');
        if (res.ok) {
          const data = await res.json();
          setFavoriteIds(data.apartmentIds || []);
        }
      } catch (err) {
        console.error('Failed to fetch favorites', err);
      }
    };
    fetchFavorites();
  }, []);

  const handleFavoriteToggle = (id: string) => {
    setFavoriteIds(prev =>
      prev.includes(id)
        ? prev.filter(fid => fid !== id)
        : [...prev, id]
    );
  };

  const districts = [
    { id: '1', name: 'Belváros' },
    { id: '2', name: 'Terézváros' },
    { id: '3', name: 'Erzsébetváros' },
    { id: '4', name: 'Józsefváros' },
    { id: '5', name: 'Ferencváros' },
    { id: '6', name: 'Terézváros' },
    { id: '7', name: 'Erzsébetváros' },
    { id: '8', name: 'Józsefváros' },
    { id: '9', name: 'Ferencváros' },
    { id: '10', name: 'Kőbánya' },
    { id: '11', name: 'Újbuda' },
    { id: '12', name: 'Hegyvidék' },
    { id: '13', name: 'Angyalföld' },
    { id: '14', name: 'Zugló' },
    { id: '15', name: 'Rákosmente' },
    { id: '16', name: 'Pesthidegkút' },
    { id: '17', name: 'Erzsébetfalva' },
    { id: '18', name: 'Pestszentimre' },
    { id: '19', name: 'Kispest' },
    { id: '20', name: 'Pesterzsébet' },
    { id: '21', name: 'Csepel' },
    { id: '22', name: 'Budavári' },
    { id: '23', name: 'Krisztinaváros' },
  ];

  const performSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search error');
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  useEffect(() => {
    if (activeTab === 'manual' && (query || Object.values(filters).some(v => v))) {
      performSearch();
    }
  }, [query, filters, performSearch, activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'ai'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            🤖 AI Search
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-6 py-3 font-medium transition-colors border-b-2 ${activeTab === 'manual'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            🔍 Manual Search
          </button>
        </div>

        {/* AI Search Tab */}
        {activeTab === 'ai' && (
          <div className="bg-white rounded-lg shadow p-6">
            <ChatSearch />
          </div>
        )}

        {/* Manual Search Tab */}
        {activeTab === 'manual' && (
          <>
            <form onSubmit={handleSearch} className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="mb-6">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apartments..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <select
                  value={filters.district || ''}
                  onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">All Districts</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={filters.minPrice || ''}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="Min Price"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />

                <input
                  type="number"
                  value={filters.maxPrice || ''}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Max Price"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />

                <select
                  value={filters.bedrooms || ''}
                  onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Any Bedrooms</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3+ Bedrooms</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">{error}</div>}

            {results.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((apt) => (
                  <Link key={apt.id} href={`/apartments/${apt.id}`}>
                    <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden">
                      {apt.image_urls[0] && (
                        <div className="relative h-48">
                          <Image
                            src={apt.image_urls[0]}
                            alt={apt.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.preventDefault()}>
                            <SaveApartmentButton
                              apartmentId={apt.id}
                              initialSaved={favoriteIds.includes(apt.id)}
                              onSaved={() => handleFavoriteToggle(apt.id)}
                            />
                          </div>
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{apt.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{apt.description}</p>
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xl font-bold text-blue-600">₹{apt.price_huf.toLocaleString()}</span>
                          <span className="text-sm text-gray-500">{apt.area_sqm}m²</span>
                        </div>
                        {apt.aiScore && (
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="text-sm font-semibold text-blue-600">AI Score: {apt.aiScore}%</div>
                            {apt.aiReasoning && <p className="text-xs text-gray-600 mt-1">{apt.aiReasoning}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : !loading && query ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No apartments found matching your criteria.</p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
