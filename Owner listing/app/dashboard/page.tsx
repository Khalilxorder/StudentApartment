import { createClient } from '@/utils/supabaseClient';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import UserAuthStatus from '@/components/UserAuthStatus';

export default async function UserDashboard() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user stats - run queries in parallel for better performance
  const [
    { data: favorites, count: favoritesCount },
    { data: bookings, count: bookingsCount },
    { data: unreadMessages },
    { data: recentSearches }
  ] = await Promise.all([
    supabase
      .from('favorites')
      .select('*, apartments(title, price_huf, district, image_urls)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('bookings')
      .select('*, apartments(title, district, image_urls)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('messages')
      .select('id')
      .eq('read', false)
      .neq('sender_email', user.email),
    supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const unreadCount = unreadMessages?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <UserAuthStatus />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-lg p-8 mb-8 text-gray-900">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-gray-800 text-lg">
            Find your perfect student apartment in Budapest
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Favorites */}
          <Link href="/dashboard/favorites" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition">
                <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {favoritesCount !== undefined ? favoritesCount : '...'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Saved Favorites</h3>
            <p className="text-xs text-gray-500">Apartments you loved</p>
          </Link>

          {/* Bookings */}
          <Link href="/dashboard/bookings" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {bookingsCount !== undefined ? bookingsCount : '...'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">My Applications</h3>
            <p className="text-xs text-gray-500">Booking requests</p>
          </Link>

          {/* Messages */}
          <Link href="/dashboard/messages" className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition group relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-full group-hover:bg-yellow-200 transition">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {unreadCount !== undefined ? unreadCount : '...'}
              </span>
            </div>
            {unreadCount > 0 && (
              <div className="absolute top-4 right-4">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                </span>
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600 mb-1">Unread Messages</h3>
            <p className="text-xs text-gray-500">From landlords</p>
          </Link>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Favorites */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Favorites</h2>
                <Link href="/dashboard/favorites" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {favorites === undefined ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                      </div>
                    </div>
                  ))
                ) : favorites && favorites.length > 0 ? (
                  favorites.map((fav: any) => (
                    <Link key={fav.id} href={`/apartments/${fav.apartment_id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition">
                      {fav.apartments?.image_urls?.[0] && (
                        <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={fav.apartments.image_urls[0]}
                            alt={fav.apartments.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {fav.apartments?.title || 'Untitled'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          District {fav.apartments?.district}
                        </p>
                        <p className="text-sm font-semibold text-yellow-600 mt-1">
                          {fav.apartments?.price_huf?.toLocaleString()} HUF/month
                        </p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <p className="text-sm">No favorites yet</p>
                    <Link href="/apartments" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium mt-2 inline-block">
                      Browse apartments
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Active Applications */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">My Applications</h2>
                <Link href="/dashboard/bookings" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium">
                  View All →
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {bookings === undefined ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
                        </div>
                        <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                      </div>
                    </div>
                  ))
                ) : bookings && bookings.length > 0 ? (
                  bookings.map((booking: any) => (
                    <div key={booking.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {booking.apartments?.image_urls?.[0] && (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={booking.apartments.image_urls[0]}
                                alt={booking.apartments.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {booking.apartments?.title || 'Untitled'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              District {booking.apartments?.district}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Applied {new Date(booking.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                            booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status}
                          </span>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            {booking.total_amount?.toLocaleString()} HUF
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm">No applications yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-yellow-50 rounded-lg shadow-sm border border-yellow-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/apartments"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition border border-yellow-200"
                >
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Search Apartments</p>
                    <p className="text-xs text-gray-500">Find your perfect home</p>
                  </div>
                </Link>

                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-3 p-3 bg-white rounded-lg hover:shadow-md transition border border-gray-200"
                >
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Edit Profile</p>
                    <p className="text-xs text-gray-500">Update your information</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches && recentSearches.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Recent Searches</h2>
                <div className="space-y-2">
                  {recentSearches.slice(0, 3).map((search: any) => (
                    <div key={search.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                                        <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      &ldquo;{search.query_text?.substring(0, 50)}...&rdquo;
                    </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">💡 Tips</h2>
              <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Save favorites to compare apartments later</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Contact landlords early for popular listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>Check transportation links to your university</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
