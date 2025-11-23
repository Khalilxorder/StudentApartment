'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

export default function AISearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<SearchFilters>({
    district: searchParams.get('district') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    bedrooms: searchParams.get('bedrooms') || '',
  });
  const [results, setResults] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    { id: '11', name: 'Újpalota' },
    { id: '12', name: 'Hegyvidék' },
    { id: '13', name: 'Újbuda' },
    { id: '14', name: 'Zugló' },
    { id: '15', name: 'Rákospalota' },
  ];

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          filters: {
            district: filters.district ? parseInt(filters.district) : undefined,
            minPrice: filters.minPrice ? parseInt(filters.minPrice) : undefined,
            maxPrice: filters.maxPrice ? parseInt(filters.maxPrice) : undefined,
            bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results || []);

      // Update URL with search params
      const params = new URLSearchParams();
      params.set('q', query);
      if (filters.district) params.set('district', filters.district);
      if (filters.minPrice) params.set('minPrice', filters.minPrice);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.bedrooms) params.set('bedrooms', filters.bedrooms);

      router.replace(`/search?${params.toString()}`, { scroll: false });
    } catch (err) {
      setError('Failed to perform AI search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearFilters = () => {
    setFilters({
      district: '',
      minPrice: '',
      maxPrice: '',
      bedrooms: '',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU').format(price) + ' HUF';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              🏠 Student Apartments
            </Link>
            <div className="text-sm text-gray-500">
              AI-Powered Search
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI Search Query */}
            <div>
              <label htmlFor="query" className="block text-lg font-semibold text-gray-900 mb-2">
                🤖 Describe your ideal apartment
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., 'quiet studio near university with balcony, budget 150k'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 top-2 bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '🔄 Searching...' : '🔍 Search'}
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Try natural language like "cozy 2BR near ELTE with garden" or "affordable studio in the city center"
              </p>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  id="district"
                  value={filters.district}
                  onChange={(e) => setFilters(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Any district</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price (HUF)
                </label>
                <input
                  type="number"
                  id="minPrice"
                  value={filters.minPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="80000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Max Price (HUF)
                </label>
                <input
                  type="number"
                  id="maxPrice"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="200000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Min Bedrooms
                </label>
                <select
                  id="bedrooms"
                  value={filters.bedrooms}
                  onChange={(e) => setFilters(prev => ({ ...prev, bedrooms: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Clear Filters
              </button>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Found {results.length} AI-matched apartments
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((apartment) => (
                <Link
                  key={apartment.id}
                  href={`/apartments/${apartment.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200">
                    {apartment.image_urls && apartment.image_urls[0] ? (
                      <img
                        src={apartment.image_urls[0]}
                        alt={apartment.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        🏠
                      </div>
                    )}
                    {/* AI Score Badge */}
                    {apartment.aiScore && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        {Math.round(apartment.aiScore * 100)}% match
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {apartment.title}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <span>🏠 {apartment.bedrooms} bed</span>
                      <span>🛁 {apartment.bathrooms} bath</span>
                      <span>📐 {apartment.area_sqm} m²</span>
                    </div>

                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {apartment.description}
                    </p>

                    {/* AI Reasoning */}
                    {apartment.aiReasoning && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                        <p className="text-xs text-blue-800">
                          <strong>AI Match:</strong> {apartment.aiReasoning}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-indigo-600">
                        {formatPrice(apartment.price_huf)}
                      </span>
                      <span className="text-sm text-gray-500">
                        District {apartment.district}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {query && !loading && results.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No apartments found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or filters
            </p>
            <button
              onClick={() => setQuery('')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              AI is analyzing apartments...
            </h3>
            <p className="text-gray-600">
              This may take a few seconds as we find your perfect match
            </p>
          </div>
        )}
      </div>
    </div>
  );
}