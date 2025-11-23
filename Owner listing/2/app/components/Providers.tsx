'use client';

import { ErrorBoundary } from './ErrorBoundary';
import { PostHogProvider } from './AnalyticsProvider';
import QueryProvider from './QueryProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PostHogProvider>
        <QueryProvider>{children}</QueryProvider>
      </PostHogProvider>
    </ErrorBoundary>
  );
}
