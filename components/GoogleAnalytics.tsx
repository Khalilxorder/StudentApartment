'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export default function GoogleAnalytics() {
  useEffect(() => {
    // Initialize Google Analytics if measurement ID is available
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    if (gaMeasurementId && typeof window !== 'undefined') {
      analytics.initializeGoogleAnalytics({
        measurementId: gaMeasurementId,
        debug: process.env.NODE_ENV === 'development',
      });
    }
  }, []);

  return null; // This component doesn't render anything
}