'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SearchBar({ initialParams }: { initialParams: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [district, setDistrict] = useState(initialParams?.district || '');
  const [bedrooms, setBedrooms] = useState(initialParams?.bedrooms || '');
  const [minPrice, setMinPrice] = useState(initialParams?.min_price || '');
  const [maxPrice, setMaxPrice] = useState(initialParams?.max_price || '');
  const [search, setSearch] = useState(initialParams?.search || '');

  // Only update router when user presses Search, not on every keystroke
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (district) params.set('district', district);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (search) params.set('search', search);
    router.replace(`/apartments?${params.toString()}`);
  };

  // Optionally, update fields if route changes (ex: browser back/forward)
  useEffect(() => {
    setDistrict(searchParams.get('district') || '');
    setBedrooms(searchParams.get('bedrooms') || '');
    setMinPrice(searchParams.get('min_price') || '');
    setMaxPrice(searchParams.get('max_price') || '');
    setSearch(searchParams.get('search') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-xl shadow-md space-y-4"
    >
      {/* Main Search */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search apartments by location, features, or keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
        />
        <button
          type="submit"
          className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs text-gray-600 mb-1">District (1-23)</label>
          <input
            type="number"
            placeholder="Any"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            min={1}
            max={23}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs text-gray-600 mb-1">Min Bedrooms</label>
          <input
            type="number"
            placeholder="Any"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            min={0}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-600 mb-1">Min Price (HUF)</label>
          <input
            type="number"
            placeholder="e.g. 120000"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            step={10000}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-600 mb-1">Max Price (HUF)</label>
          <input
            type="number"
            placeholder="e.g. 200000"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            step={10000}
            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 italic">
        💡 Tip: Search for &ldquo;budget wifi&rdquo;, &ldquo;120k&rdquo;, &ldquo;quiet study&rdquo;, or use filters above
      </p>
    </form>
  );
}