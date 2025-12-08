'use client';

/**
 * Loading Skeletons for improved perceived performance
 * Eliminates "laggy" feel during data loading
 */

interface SkeletonProps {
    className?: string;
}

function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
        />
    );
}

/**
 * Apartment card skeleton
 */
export function ApartmentCardSkeleton() {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Image skeleton */}
            <Skeleton className="aspect-[4/3] w-full" />

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <Skeleton className="h-5 w-3/4" />

                {/* Location */}
                <Skeleton className="h-4 w-1/2" />

                {/* Details row */}
                <div className="flex gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                </div>

                {/* Price */}
                <Skeleton className="h-6 w-1/3" />
            </div>
        </div>
    );
}

/**
 * Grid of apartment card skeletons
 */
export function ApartmentGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <ApartmentCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Apartment detail page skeleton
 */
export function ApartmentDetailSkeleton() {
    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Gallery */}
            <div className="grid grid-cols-4 gap-2">
                <Skeleton className="col-span-2 row-span-2 aspect-[4/3]" />
                <Skeleton className="aspect-square" />
                <Skeleton className="aspect-square" />
                <Skeleton className="aspect-square" />
                <Skeleton className="aspect-square" />
            </div>

            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-5 w-1/3" />
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-6">
                    {/* Description */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>

                    {/* Amenities */}
                    <div className="grid grid-cols-3 gap-4">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <Skeleton key={i} className="h-10" />
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <Skeleton className="h-48 rounded-lg" />
                    <Skeleton className="h-12 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

/**
 * Profile page skeleton
 */
export function ProfileSkeleton() {
    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
            {/* Avatar and name */}
            <div className="text-center space-y-4">
                <Skeleton className="w-24 h-24 rounded-full mx-auto" />
                <Skeleton className="h-6 w-1/3 mx-auto" />
                <Skeleton className="h-4 w-1/4 mx-auto" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
                <Skeleton className="h-20 rounded-lg" />
            </div>

            {/* Form fields */}
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Message list skeleton
 */
export function MessageListSkeleton() {
    return (
        <div className="space-y-4 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-xs ${i % 2 === 0 ? '' : ''}`}>
                        <Skeleton className={`h-16 w-48 rounded-lg`} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Conversation list skeleton
 */
export function ConversationListSkeleton() {
    return (
        <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                </div>
            ))}
        </div>
    );
}

/**
 * Dashboard stats skeleton
 */
export function DashboardStatsSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-8 w-2/3" />
                </div>
            ))}
        </div>
    );
}

/**
 * Search results skeleton
 */
export function SearchResultsSkeleton() {
    return (
        <div className="space-y-4">
            {/* Filters bar */}
            <div className="flex gap-3 overflow-x-auto pb-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />
                ))}
            </div>

            {/* Results count */}
            <Skeleton className="h-5 w-40" />

            {/* Grid */}
            <ApartmentGridSkeleton count={6} />
        </div>
    );
}

export { Skeleton };

// Aliases for backward compatibility
export { ConversationListSkeleton as ChatListSkeleton };
export { MessageListSkeleton as MessagesSkeleton };
