'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ApartmentListingCard from './ApartmentListingCard';
import { useRouter } from 'next/navigation';
import { Apartment } from '@/types/apartment';

interface FavoriteWithApartment {
    id: string;
    user_id: string;
    apartment_id: string;
    created_at: string;
    apartments: Apartment | null;
}

interface FavoritesListProps {
    favorites: FavoriteWithApartment[];
    currentUserId: string;
}

export default function FavoritesList({ favorites: initialFavorites, currentUserId }: FavoritesListProps) {
    const t = useTranslations('Favorites');
    const [favorites] = useState(initialFavorites);
    const router = useRouter();

    const [favoriteIds, setFavoriteIds] = useState<string[]>(
        initialFavorites
            .map(f => f.apartments?.id)
            .filter((id): id is string => Boolean(id))
    );

    const handleToggleFavorite = async (apartmentId: string) => {
        const isCurrentlySaved = favoriteIds.includes(apartmentId);

        if (isCurrentlySaved) {
            setFavoriteIds(prev => prev.filter(id => id !== apartmentId));
        } else {
            setFavoriteIds(prev => [...prev, apartmentId]);
        }

        router.refresh();
    };

    if (favorites.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                    <svg className="w-24 h-24 mx-auto mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('no_favorites_title')}</h2>
                    <p className="text-gray-600 mb-6">{t('no_favorites_description')}</p>
                    <a
                        href="/apartments"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {t('browse_apartments')}
                    </a>
                </div>
            </div>
        );
    }

    // Filter out items that have been un-favorited
    const visibleFavorites = favorites.filter(fav =>
        fav.apartments && favoriteIds.includes(fav.apartments.id)
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleFavorites.map((fav) => {
                const apt = fav.apartments;
                if (!apt) return null;

                return (
                    <ApartmentListingCard
                        key={fav.id}
                        apt={apt}
                        userWishedFeatures={[]}
                        favoriteIds={favoriteIds}
                        onToggleFavorite={handleToggleFavorite}
                    />
                );
            })}
        </div>
    );
}
