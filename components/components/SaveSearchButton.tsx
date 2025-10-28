'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import SavedSearchCreation from './SavedSearchCreation';

interface SaveSearchButtonProps {
  searchParams: Record<string, string> | undefined;
  session: any;
}

export default function SaveSearchButton({ searchParams, session }: SaveSearchButtonProps) {
  const [showSaveSearch, setShowSaveSearch] = useState(false);

  if (!session) return null;

  // Convert search params to saved search format
  const getSearchCriteria = () => {
    const criteria: any = {};

    if (searchParams?.search) criteria.search = searchParams.search;
    if (searchParams?.min_price) criteria.minPrice = parseInt(searchParams.min_price);
    if (searchParams?.max_price) criteria.maxPrice = parseInt(searchParams.max_price);
    if (searchParams?.bedrooms) criteria.bedrooms = parseInt(searchParams.bedrooms);
    if (searchParams?.bathrooms) criteria.bathrooms = parseFloat(searchParams.bathrooms);
    if (searchParams?.district) criteria.district = parseInt(searchParams.district);

    return criteria;
  };

  return (
    <>
      <button
        onClick={() => setShowSaveSearch(true)}
        className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
      >
        <Save className="w-4 h-4" />
        Save Search
      </button>

      {showSaveSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <SavedSearchCreation
              initialFilters={getSearchCriteria()}
              onSave={() => setShowSaveSearch(false)}
              onCancel={() => setShowSaveSearch(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}