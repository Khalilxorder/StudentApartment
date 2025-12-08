'use client';

import { useState } from 'react';
import ApartmentListingCard from './ApartmentListingCard';
import { useRouter } from 'next/navigation';

interface FavoritesListProps {
    favorites: any[];
    currentUserId: string;
}

export default function FavoritesList({ favorites: initialFavorites, currentUserId }: FavoritesListProps) {
    const [favorites, setFavorites] = useState(initialFavorites);
    const router = useRouter();

    // Extract apartment IDs that are favorited
    // In this view, all listed items are favorites by definition, but we track them to manage the toggle state
    const [favoriteIds, setFavoriteIds] = useState<string[]>(
        initialFavorites.map(f => f.apartments?.id).filter(Boolean)
    );

    const handleToggleFavorite = async (apartmentId: string) => {
        // In the favorites view, toggling off means removing from the list
        // We update the UI optimistically
        const isCurrentlySaved = favoriteIds.includes(apartmentId);

        if (isCurrentlySaved) {
            setFavoriteIds(prev => prev.filter(id => id !== apartmentId));
        } else {
            setFavoriteIds(prev => [...prev, apartmentId]);
        }

        // The actual API call is handled by the SaveApartmentButton internal logic usually, 
        // but here we are using the card's callback.
        // However, ApartmentListingCard uses SaveApartmentButton which manages its own state 
        // AND calls onToggleFavorite.
        // If we want to remove the item from the list entirely when un-favorited (perhaps after a delay), logic goes here.

        // For now, let's just refresh the router to sync with server state if needed, 
        // or let the button handle the API call.
        router.refresh();
    };

    if (favorites.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                    <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No favorites yet</h2>
                    <p className="text-gray-600 mb-6">
                        Start saving apartments you love to easily find them later
                    </p>
                    <a
                        href="/apartments"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Browse Apartments
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav: any) => {
                const apt = fav.apartments;
                if (!apt) return null;

                // If the item is no longer in favoriteIds (user untoggled it), we could hide it
                // For strict correctness with the listing card, we pass the current favoriteIds state
                if (!favoriteIds.includes(apt.id)) {
                    // Option: Don't render if removed? 
                    // Better UX: Show it but with empty heart, allows re-adding before refresh.
                    // But this is the Favorites page. Usually items disappear.
                    // Let's keep it visible until refresh or explictly filter.
                }

                return (
                    <ApartmentListingCard
                        key={fav.id}
                        apt={apt}
                        userWishedFeatures={[]} // No personalization context in simple favorites view
                        favoriteIds={favoriteIds}
                        onToggleFavorite={handleToggleFavorite}
                    // No specific AI reasoning context available here usually
                    />
                );
            })}
        </div>
    );
}
