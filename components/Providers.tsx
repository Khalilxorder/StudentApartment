'use client';

import { ErrorBoundary } from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { AccessibilityProvider } from './AccessibilityProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <QueryProvider>{children}</QueryProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
