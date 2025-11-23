/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function SearchBar({ initialParams }: { initialParams: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [district, setDistrict] = useState(initialParams?.district || '');
  const [bedrooms, setBedrooms] = useState(initialParams?.bedrooms || '');
  const [search, setSearch] = useState(initialParams?.search || '');

  useEffect(() => {
    const params = new URLSearchParams();

    if (district) params.set('district', district);
    if (bedrooms) params.set('bedrooms', bedrooms);
    if (search) params.set('search', search);

    // router is stable across renders in next/navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
    router.replace(`/apartments?${params.toString()}`);
  }, [district, bedrooms, search]);

  return (
    <div className="flex gap-4 items-center bg-white p-4 rounded-md shadow-md">
      <input
        type="text"
        placeholder="District"
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
        className="border rounded p-2 w-1/4"
      />
      <input
        type="number"
        placeholder="Min Bedrooms"
        value={bedrooms}
        onChange={(e) => setBedrooms(e.target.value)}
        className="border rounded p-2 w-1/4"
      />
      <input
        type="text"
        placeholder="Search by address or description"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded p-2 flex-1"
      />
    </div>
  );
}
