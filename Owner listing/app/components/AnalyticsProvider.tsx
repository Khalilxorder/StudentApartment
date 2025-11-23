'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug(); // Enable debug mode in development
          }
        },
        capture_pageview: true, // Automatically capture pageviews
        capture_pageleave: true, // Capture when users leave pages
        autocapture: true, // Automatically capture clicks, form submissions, etc.
      });
    }

    // Initialize our custom analytics service
    analytics.initialize();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Enhanced helper to track custom events (uses both PostHog and our analytics)
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  // Track with PostHog
  if (typeof window !== 'undefined' && posthog) {
    posthog.capture(eventName, properties);
  }

  // Track with our custom analytics service
  analytics.trackEvent(eventName, properties);
}

// Helper to identify users
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window !== 'undefined' && posthog) {
    posthog.identify(userId, traits);
  }
}

// Helper to reset user on logout
export function resetUser() {
  if (typeof window !== 'undefined' && posthog) {
    posthog.reset();
  }
}

// Export analytics service for direct use
export { analytics };
