'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

type SearchBarProps = {
  initialParams: Record<string, string> | undefined;
};

const DISTRICTS = Array.from({ length: 23 }, (_, index) => `${index + 1}`);

const COMMUTE_OPTIONS = [
  { value: '', label: 'Any commute' },
  { value: '10', label: '<= 10 minutes to campus' },
  { value: '20', label: '<= 20 minutes to campus' },
  { value: '30', label: '<= 30 minutes to campus' },
  { value: '45', label: '<= 45 minutes to campus' },
];

const BEDROOM_OPTIONS = [
  { value: '', label: 'Any bedrooms' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
];

const LEASE_OPTIONS: Array<{ value: 'any' | 'long' | 'short'; label: string; description: string }> = [
  { value: 'any', label: 'Any term', description: 'Show all matching leases' },
  {
    value: 'long',
    label: 'Long term',
    description: 'Minimum 7 month lease',
  },
  {
    value: 'short',
    label: 'Short stay',
    description: 'Lease 6 months or less',
  },
];

export default function SearchBar({ initialParams }: SearchBarProps) {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState(initialParams?.search ?? '');
  const [district, setDistrict] = useState(initialParams?.district ?? '');
  const [bedrooms, setBedrooms] = useState(initialParams?.bedrooms ?? '');
  const [minPrice, setMinPrice] = useState(initialParams?.min_price ?? '');
  const [maxPrice, setMaxPrice] = useState(initialParams?.max_price ?? '');
  const [leaseTerm, setLeaseTerm] = useState<'any' | 'long' | 'short'>(
    (initialParams?.term as 'any' | 'long' | 'short') ?? 'any'
  );
  const [maxCommute, setMaxCommute] = useState(initialParams?.max_commute ?? '');

  const hasMounted = useRef(false);

  const paramsSignature = useMemo(
    () => JSON.stringify(initialParams ?? {}),
    [initialParams]
  );

  useEffect(() => {
    const params = initialParams ?? {};
    setSearchTerm(params.search ?? '');
    setDistrict(params.district ?? '');
    setBedrooms(params.bedrooms ?? '');
    setMinPrice(params.min_price ?? '');
    setMaxPrice(params.max_price ?? '');
    setLeaseTerm((params.term as 'any' | 'long' | 'short') ?? 'any');
    setMaxCommute(params.max_commute ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsSignature]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    const params = new URLSearchParams();

    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (district) params.set('district', district);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (leaseTerm !== 'any') params.set('term', leaseTerm);
    if (maxCommute) params.set('max_commute', maxCommute);

    params.set('page', '1');
    const queryString = params.toString();
    router.replace(queryString ? `/apartments?${queryString}` : '/apartments');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, district, bedrooms, minPrice, maxPrice, leaseTerm, maxCommute]);

  return (
    <section className="bg-white p-6 rounded-xl shadow-md space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3 text-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex-1">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tell us what you need: 'quiet near ELTE', '2 bed with balcony', 'under 150k'"
            className="w-full border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </label>
        <div className="flex gap-2">
          {LEASE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setLeaseTerm(option.value)}
              className={`rounded-lg border px-4 py-2 text-sm transition ${
                leaseTerm === option.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
              aria-pressed={leaseTerm === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            District
          </label>
          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Any district</option>
            {DISTRICTS.map((value) => (
              <option key={value} value={value}>
                District {value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Bedrooms
          </label>
          <select
            value={bedrooms}
            onChange={(event) => setBedrooms(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {BEDROOM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Min price (HUF)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="e.g. 120000"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Max price (HUF)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="e.g. 200000"
            className="w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
            Commute to campus
          </label>
          <select
            value={maxCommute}
            onChange={(event) => setMaxCommute(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {COMMUTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Filters update results automatically. Reset with the clear filters button
        below.
      </p>
    </section>
  );
}

