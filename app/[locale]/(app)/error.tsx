'use client';

import { ReactNode } from 'react';

interface ErrorBoundaryProps {
  error: Error;
  reset: () => void;
}

export default function StudentErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}