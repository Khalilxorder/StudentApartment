import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({ className = '', lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded mb-2 last:mb-0" />
      ))}
    </div>
  );
}

interface ApartmentCardSkeletonProps {
  className?: string;
}

export function ApartmentCardSkeleton({ className = '' }: ApartmentCardSkeletonProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden animate-pulse ${className}`}>
      <div className="h-48 bg-gray-200" />
      <div className="p-4">
        <div className="h-6 bg-gray-200 rounded mb-2" />
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-4 w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded w-16" />
          <div className="h-6 bg-gray-200 rounded w-20" />
          <div className="h-6 bg-gray-200 rounded w-14" />
        </div>
      </div>
    </div>
  );
}