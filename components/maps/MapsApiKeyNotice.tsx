'use client';

import React from 'react';

import { DEFAULT_FALLBACK_MESSAGE } from '@/lib/maps/config';

export interface MapsApiKeyNoticeProps {
  message?: string;
  instruction?: React.ReactNode;
  className?: string;
}

const DEFAULT_INSTRUCTION = (
  <p className="mt-2 text-xs text-orange-700">
    Add <code>NEXT_PUBLIC_MAPS_API_KEY</code> to your environment variables and refresh the page.
  </p>
);

export function MapsApiKeyNotice({
  message = DEFAULT_FALLBACK_MESSAGE,
  instruction = DEFAULT_INSTRUCTION,
  className,
}: MapsApiKeyNoticeProps) {
  const classes = ['w-full rounded-lg border border-dashed border-orange-300 bg-orange-50 p-6 text-center'];
  if (className) {
    classes.push(className);
  }

  return (
    <div className={classes.join(' ')} data-testid="maps-fallback">
      <p className="text-sm font-medium text-orange-800 whitespace-pre-line">{message}</p>
      {instruction}
    </div>
  );
}
