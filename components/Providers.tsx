'use client';

import { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { AccessibilityProvider } from './AccessibilityProvider';

function GlobalFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <QueryProvider>
          <Suspense fallback={<GlobalFallback />}>
            {children}
          </Suspense>
        </QueryProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
