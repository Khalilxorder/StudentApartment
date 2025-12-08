import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import ApartmentImageCarousel from '@/components/ApartmentImageCarousel';

export default async function OwnerListings() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get all apartments owned by this user
  const { data: apartments } = await supabase
    .from('apartments')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/owner" className="text-blue-600 hover:text-blue-700">
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/owner/listings/wizard"
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium"
              >
                + New Listing (Wizard)
              </Link>
              <Link
                href="/owner/listings/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Quick Add
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {apartments && apartments.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {apartments.map((apartment) => (
              <div key={apartment.id} className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                {/* Image */}
                <ApartmentImageCarousel
                  images={apartment.image_urls || []}
                  alt={apartment.title}
                />
                {!apartment.is_available && (
                  <div className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full z-10 pointer-events-none">
                    Unavailable
                  </div>
                )}
                {apartment.featured && (
                  <div className="absolute top-2 left-2 px-3 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full z-10 pointer-events-none">
                    ⭐ Featured
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {apartment.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span>📍 District {apartment.district}</span>
                    <span>•</span>
                    <span>{apartment.bedrooms} BR</span>
                    <span>•</span>
                    <span className="font-semibold text-blue-600">
                      {apartment.price_huf?.toLocaleString()} HUF/month
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 py-3 border-t border-b border-gray-200 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {apartment.view_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {apartment.inquiry_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Inquiries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-900">
                        {apartment.booking_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Bookings</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/owner/listings/${apartment.id}/edit`}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/owner/listings/${apartment.id}`}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 transition font-medium"
                    >
                      View Details
                    </Link>
                    <button
                      className="px-4 py-2 text-gray-400 hover:text-red-600 transition"
                      title="More options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by creating your first apartment listing. It only takes a few minutes!
              </p>
              <Link
                href="/owner/listings/create"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Create First Listing
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
