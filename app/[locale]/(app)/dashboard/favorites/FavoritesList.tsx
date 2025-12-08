'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link
import ApartmentListingCard from '@/components/ApartmentListingCard';

interface FavoritesListProps {
  favorites: any[];
}

export default function FavoritesList({ favorites: initialFavorites }: FavoritesListProps) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const router = useRouter();

  const handleToggleFavorite = (id: string) => {
    // If we unleash a "toggle" on a favorite page, it implies "remove"
    // We remove it from the local list immediately
    setFavorites(prev => prev.filter(fav => fav.apartments.id !== id));
    router.refresh(); // Refresh server data in background
  };

  if (!favorites || favorites.length === 0) {
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
          <Link
            href="/apartments"
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Browse Apartments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((fav: any) => {
        const apt = fav.apartments;
        if (!apt) return null;

        return (
          <ApartmentListingCard
            key={fav.id}
            apt={apt}
            favoriteIds={[apt.id]} // It's in the list, so it's favorited
            onToggleFavorite={handleToggleFavorite}
          />
        );
      })}
    </div>
  );
}
