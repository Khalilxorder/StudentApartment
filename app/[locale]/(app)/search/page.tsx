'use client';

import { Suspense } from 'react';
import SearchContent from './search-client';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
