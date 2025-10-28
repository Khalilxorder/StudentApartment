import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default async function FavoritesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: favorites } = await supabase
    .from('favorites')
    .select('*, apartments(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Favorites</h1>
            <p className="text-gray-600 mt-2">
              {favorites?.length || 0} saved apartments
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Favorites Grid */}
        {favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav: any) => {
              const apt = fav.apartments;
              if (!apt) return null;

              return (
                <div key={fav.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group">
                  {/* Image */}
                  <Link href={`/apartments/${apt.id}`} className="block relative h-48 bg-gray-200">
                    {apt.image_urls?.[0] ? (
                      <Image
                        src={apt.image_urls[0]}
                        alt={apt.title || 'Apartment'}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                    
                    {/* Featured Badge */}
                    {apt.featured && (
                      <div className="absolute top-3 left-3 bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-xs font-semibold">
                        ⭐ Featured
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="p-4">
                    <Link href={`/apartments/${apt.id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-yellow-600 transition line-clamp-2">
                        {apt.title || 'Untitled Apartment'}
                      </h3>
                    </Link>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        District {apt.district}, Budapest
                      </p>
                      
                      <p className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {apt.bedrooms || 0} bed • {apt.bathrooms || 0} bath • {apt.size_sqm || 0} m²
                      </p>
                    </div>

                    {/* Price & Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">
                          {apt.price_huf?.toLocaleString() || 'N/A'} HUF
                        </p>
                        <p className="text-xs text-gray-500">per month</p>
                      </div>
                      
                      <form action="/api/favorites/remove" method="POST">
                        <input type="hidden" name="favoriteId" value={fav.id} />
                        <button
                          type="submit"
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"
                          title="Remove from favorites"
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </form>
                    </div>

                    {/* Saved date */}
                    <p className="mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      Saved {new Date(fav.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Empty State
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
        )}
      </div>
    </div>
  );
}
