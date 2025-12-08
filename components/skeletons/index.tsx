'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ApartmentCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Image Skeleton */}
      <Skeleton className="h-48 w-full rounded-none" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Price */}
        <Skeleton className="h-6 w-1/2" />
        
        {/* Details Row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
        
        {/* Location */}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

export function ApartmentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ApartmentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Received message */}
      <div className="flex justify-start">
        <Skeleton className="h-16 w-48 rounded-lg" />
      </div>
      {/* Sent message */}
      <div className="flex justify-end">
        <Skeleton className="h-12 w-40 rounded-lg" />
      </div>
      {/* Received message */}
      <div className="flex justify-start">
        <Skeleton className="h-20 w-56 rounded-lg" />
      </div>
      {/* Sent message */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
      
      {/* Name */}
      <Skeleton className="h-6 w-1/2 mx-auto" />
      
      {/* Role */}
      <Skeleton className="h-4 w-1/4 mx-auto" />
      
      {/* Stats */}
      <div className="flex justify-center gap-8">
        <div className="text-center space-y-1">
          <Skeleton className="h-6 w-12 mx-auto" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="text-center space-y-1">
          <Skeleton className="h-6 w-12 mx-auto" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg p-6 border border-gray-200">
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function SearchBarSkeleton() {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-1/12" />
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-b-0">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
